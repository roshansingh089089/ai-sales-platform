package com.roslabs.aisales.leaddiscovery.application;

import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.SearchRequest;
import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.WebsiteFilter;
import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import java.util.*;
import org.slf4j.*;
import org.springframework.stereotype.Service;

@Service
public class LeadDiscoveryOrchestrator {
  private static final Logger log = LoggerFactory.getLogger(LeadDiscoveryOrchestrator.class);
  private static final double COORDINATE_DUPLICATE_THRESHOLD_METERS = 75.0;

  private final List<LeadDiscoveryProvider> providers;
  private final CategoryExpansionService categories;
  private final LeadScoringService scoring;
  private final LeadDiscoveryProperties properties;

  public LeadDiscoveryOrchestrator(
      List<LeadDiscoveryProvider> providers,
      CategoryExpansionService categories,
      LeadScoringService scoring,
      LeadDiscoveryProperties properties) {
    this.providers = providers;
    this.categories = categories;
    this.scoring = scoring;
    this.properties = properties;
  }

  public List<DiscoveredLead> discover(SearchRequest request) {
    int maximumResults = maximumResults(request.maximumResults());
    var expandedCategories = categories.expand(request.category());
    var candidates = new ArrayList<LeadCandidate>();
    log.info(
        "lead_discovery_search_parameters category=\"{}\" expandedCategories={} location=\"{}\" radiusMeters={} requestedMaximumResults={} effectiveMaximumResults={} configuredMaximumResults={}",
        request.category(),
        expandedCategories,
        request.location(),
        request.radiusMeters(),
        request.maximumResults(),
        maximumResults,
        properties.maximumResultsPerSearch());

    for (var provider : providers) {
      int providerTotal = 0;
      for (var providerCategory : expandedCategories) {
        if (!provider.supports(providerCategory)) continue;
        var results =
            provider.search(providerCategory, request.location(), request.radiusMeters(), maximumResults);
        providerTotal += results.size();
        candidates.addAll(results);
        log.info(
            "lead_discovery_provider_results provider={} category=\"{}\" returned={}",
            provider.source(),
            providerCategory,
            results.size());
      }
      log.info(
          "lead_discovery_provider_completed provider={} returned={}",
          provider.source(),
          providerTotal);
    }

    var afterPhoneFilter = applyPhoneFilter(candidates, request);
    var afterWebsiteFilter = applyWebsiteFilter(afterPhoneFilter, request);
    var merged = merge(afterWebsiteFilter);
    log.info(
        "lead_discovery_stage stage=after_deduplication count={} removed={}",
        merged.size(),
        afterWebsiteFilter.size() - merged.size());
    var discovered =
        merged.stream()
            .map(candidate -> score(candidate, request.category()))
            .sorted(
                Comparator.comparingInt(DiscoveredLead::leadScore)
                    .reversed()
                    .thenComparing(lead -> nullsLast(lead.distanceMeters())))
            .limit(maximumResults)
            .toList();

    log.info(
        "lead_discovery_debug_summary rawCount={} afterPhoneRequired={} afterWebsiteFilter={} duplicatesRemoved={} afterDeduplication={} finalReturned={}",
        candidates.size(),
        afterPhoneFilter.size(),
        afterWebsiteFilter.size(),
        afterWebsiteFilter.size() - merged.size(),
        merged.size(),
        discovered.size());

    return discovered;
  }

  private int maximumResults(Integer requested) {
    return Math.min(
        requested == null ? properties.maximumResultsPerSearch() : requested,
        properties.maximumResultsPerSearch());
  }

  private List<LeadCandidate> merge(List<LeadCandidate> candidates) {
    var merged = new ArrayList<LeadCandidate>();
    for (var candidate : candidates) {
      var existingIndex = firstDuplicateIndex(merged, candidate);
      if (existingIndex >= 0) {
        var existing = merged.get(existingIndex);
        log.info(
            "lead_discovery_rejected stage=deduplication reason=\"duplicate business\" duplicateSource=\"{}\" duplicateSourcePlaceId=\"{}\" duplicateBusinessName=\"{}\" keptSource=\"{}\" keptSourcePlaceId=\"{}\" keptBusinessName=\"{}\"",
            candidate.source(),
            candidate.sourcePlaceId(),
            candidate.businessName(),
            existing.source(),
            existing.sourcePlaceId(),
            existing.businessName());
        merged.set(existingIndex, enrich(merged.get(existingIndex), candidate));
      } else {
        merged.add(candidate);
      }
    }
    return merged;
  }

  private int firstDuplicateIndex(List<LeadCandidate> merged, LeadCandidate candidate) {
    for (int i = 0; i < merged.size(); i++) {
      if (duplicates(merged.get(i), candidate)) return i;
    }
    return -1;
  }

  private boolean duplicates(LeadCandidate a, LeadCandidate b) {
    return sameNonBlank(a.sourcePlaceId(), b.sourcePlaceId())
        || sameNonBlank(normalizePhone(a.phoneNumber()), normalizePhone(b.phoneNumber()))
        || sameNonBlank(normalizeWebsite(a.website()), normalizeWebsite(b.website()))
        || sameNameAndNear(a, b)
        || sameNameAndSameAddress(a, b);
  }

  private LeadCandidate enrich(LeadCandidate existing, LeadCandidate incoming) {
    return new LeadCandidate(
        first(existing.source(), incoming.source()),
        first(existing.sourcePlaceId(), incoming.sourcePlaceId()),
        first(existing.businessName(), incoming.businessName()),
        mergeCategories(existing.categories(), incoming.categories()),
        first(existing.address(), incoming.address()),
        first(existing.phoneNumber(), incoming.phoneNumber()),
        first(existing.website(), incoming.website()),
        first(existing.latitude(), incoming.latitude()),
        first(existing.longitude(), incoming.longitude()),
        first(existing.distanceMeters(), incoming.distanceMeters()));
  }

  private DiscoveredLead score(LeadCandidate candidate, String requestedCategory) {
    var score = scoring.score(candidate, requestedCategory);
    return new DiscoveredLead(
        candidate.source(),
        candidate.sourcePlaceId(),
        candidate.businessName(),
        candidate.categories(),
        candidate.address(),
        candidate.phoneNumber(),
        candidate.website(),
        candidate.latitude(),
        candidate.longitude(),
        candidate.distanceMeters(),
        score.score(),
        score.qualification(),
        score.reasons());
  }

  private List<LeadCandidate> applyPhoneFilter(List<LeadCandidate> candidates, SearchRequest request) {
    if (!request.phoneRequired()) {
      log.info(
          "lead_discovery_stage stage=after_phoneRequired_filter count={} removed=0 phoneRequired=false",
          candidates.size());
      return candidates;
    }
    var filtered = new ArrayList<LeadCandidate>();
    for (var candidate : candidates) {
      if (candidate.phoneNumber() == null || candidate.phoneNumber().isBlank()) {
        log.info(
            "lead_discovery_rejected stage=phoneRequired_filter reason=\"missing phone\" source=\"{}\" sourcePlaceId=\"{}\" businessName=\"{}\"",
            candidate.source(),
            candidate.sourcePlaceId(),
            candidate.businessName());
      } else {
        filtered.add(candidate);
      }
    }
    log.info(
        "lead_discovery_stage stage=after_phoneRequired_filter count={} removed={} phoneRequired=true",
        filtered.size(),
        candidates.size() - filtered.size());
    return filtered;
  }

  private List<LeadCandidate> applyWebsiteFilter(List<LeadCandidate> candidates, SearchRequest request) {
    var websiteFilter =
        request.websiteFilter() == null ? WebsiteFilter.ANY : request.websiteFilter();
    if (websiteFilter == WebsiteFilter.ANY) {
      log.info(
          "lead_discovery_stage stage=after_website_filter count={} removed=0 websiteFilter=ANY",
          candidates.size());
      return candidates;
    }
    var filtered = new ArrayList<LeadCandidate>();
    for (var candidate : candidates) {
      boolean hasWebsite = candidate.website() != null && !candidate.website().isBlank();
      if (websiteFilter == WebsiteFilter.HAS_WEBSITE && !hasWebsite) {
        log.info(
            "lead_discovery_rejected stage=website_filter reason=\"missing website\" source=\"{}\" sourcePlaceId=\"{}\" businessName=\"{}\"",
            candidate.source(),
            candidate.sourcePlaceId(),
            candidate.businessName());
      } else if (websiteFilter == WebsiteFilter.NO_WEBSITE && hasWebsite) {
        log.info(
            "lead_discovery_rejected stage=website_filter reason=\"website present\" source=\"{}\" sourcePlaceId=\"{}\" businessName=\"{}\" website=\"{}\"",
            candidate.source(),
            candidate.sourcePlaceId(),
            candidate.businessName(),
            candidate.website());
      } else {
        filtered.add(candidate);
      }
    }
    log.info(
        "lead_discovery_stage stage=after_website_filter count={} removed={} websiteFilter={}",
        filtered.size(),
        candidates.size() - filtered.size(),
        websiteFilter);
    return filtered;
  }

  private List<String> mergeCategories(List<String> left, List<String> right) {
    var values = new LinkedHashSet<String>();
    if (left != null) values.addAll(left);
    if (right != null) values.addAll(right);
    return List.copyOf(values);
  }

  private boolean near(LeadCandidate a, LeadCandidate b) {
    if (a.latitude() == null
        || a.longitude() == null
        || b.latitude() == null
        || b.longitude() == null) {
      return false;
    }
    return distanceMeters(a.latitude(), a.longitude(), b.latitude(), b.longitude())
        <= COORDINATE_DUPLICATE_THRESHOLD_METERS;
  }

  private boolean sameNameAndNear(LeadCandidate a, LeadCandidate b) {
    return sameNonBlank(normalizeName(a.businessName()), normalizeName(b.businessName())) && near(a, b);
  }

  private boolean sameNameAndSameAddress(LeadCandidate a, LeadCandidate b) {
    return sameNonBlank(normalizeName(a.businessName()), normalizeName(b.businessName()))
        && sameNonBlank(normalize(a.address()), normalize(b.address()));
  }

  private double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
    double earthRadiusMeters = 6_371_000;
    double dLat = Math.toRadians(lat2 - lat1);
    double dLon = Math.toRadians(lon2 - lon1);
    double a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2)
                * Math.sin(dLon / 2);
    return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private boolean sameNonBlank(String left, String right) {
    return left != null && !left.isBlank() && left.equals(right);
  }

  private String normalizeName(String value) {
    var normalized = normalize(value);
    return normalized == null
        ? null
        : normalized.replaceAll("\\b(private|limited|ltd|clinic|hospital)\\b", "").trim();
  }

  private String normalizePhone(String value) {
    return value == null ? null : value.replaceAll("[^0-9+]", "");
  }

  private String normalizeWebsite(String value) {
    if (value == null) return null;
    return value.toLowerCase(Locale.ROOT)
        .replaceFirst("^https?://", "")
        .replaceFirst("^www\\.", "")
        .replaceFirst("/$", "");
  }

  private String normalize(String value) {
    return value == null
        ? null
        : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }

  private Integer nullsLast(Integer value) {
    return value == null ? Integer.MAX_VALUE : value;
  }

  private <T> T first(T preferred, T fallback) {
    if (preferred instanceof String text) {
      return text.isBlank() ? fallback : preferred;
    }
    return preferred == null ? fallback : preferred;
  }
}

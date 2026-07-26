package com.roslabs.aisales.leaddiscovery.infrastructure;

import com.roslabs.aisales.leaddiscovery.application.*;
import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.*;
import org.springframework.stereotype.Component;

@Component
public class GeoapifyProvider implements LeadDiscoveryProvider {
  private static final Logger log = LoggerFactory.getLogger(GeoapifyProvider.class);
  private static final String SOURCE = "GEOAPIFY";

  private final GeoapifyClient client;
  private final LeadDiscoveryProperties properties;

  public GeoapifyProvider(GeoapifyClient client, LeadDiscoveryProperties properties) {
    this.client = client;
    this.properties = properties;
  }

  @Override
  public String source() {
    return SOURCE;
  }

  @Override
  public boolean supports(String providerCategory) {
    return providerCategory != null && providerCategory.contains(".");
  }

  @Override
  public List<LeadCandidate> search(
      String category, String location, int radiusMeters, int maximumResults) {
    var geocoded =
        client.geocode(location).stream()
            .filter(result -> result.lat() != null && result.lon() != null)
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Location could not be resolved"));

    log.info(
        "lead_discovery_location_resolved provider={} location=\"{}\" latitude={} longitude={}",
        SOURCE,
        location,
        geocoded.lat(),
        geocoded.lon());

    var features = client.places(category, geocoded.lat(), geocoded.lon(), radiusMeters, maximumResults);
    var valid = new ArrayList<LeadCandidate>();
    for (var feature : features) {
      if (matchesCategory(feature, category)) {
        valid.add(map(feature, category));
      } else {
        log.info(
            "lead_discovery_rejected provider={} stage=category_validation reason=\"missing requested category\" requestedCategory=\"{}\" sourcePlaceId=\"{}\" businessName=\"{}\" categories={}",
            SOURCE,
            category,
            placeId(feature),
            businessName(feature),
            categories(feature));
      }
    }
    log.info(
        "lead_discovery_stage provider={} stage=after_category_validation count={} removed={}",
        SOURCE,
        valid.size(),
        features.size() - valid.size());
    return enrichMissingContactData(valid, category);
  }

  private List<LeadCandidate> enrichMissingContactData(List<LeadCandidate> candidates, String category) {
    if (!properties.geoapifyDetailsEnrichmentEnabled()) {
      log.info(
          "lead_discovery_stage provider={} stage=after_details_enrichment count={} enriched=0 skipped=\"disabled\"",
          SOURCE,
          candidates.size());
      return candidates;
    }

    var enriched = new ArrayList<LeadCandidate>();
    int requests = 0;
    int enrichedCount = 0;
    int maxRequests = Math.max(0, properties.maximumEnrichmentRequestsPerSearch());
    for (var candidate : candidates) {
      var current = candidate;
      if (needsContactEnrichment(candidate) && hasPlaceId(candidate) && requests < maxRequests) {
        requests++;
        var details = fetchDetails(candidate.sourcePlaceId());
        if (details != null) {
          var detailedCandidate = map(details, category);
          var merged = merge(candidate, detailedCandidate);
          if (hasNewContactData(candidate, merged)) {
            enrichedCount++;
          }
          current = merged;
        }
      }
      enriched.add(current);
    }
    log.info(
        "lead_discovery_stage provider={} stage=after_details_enrichment count={} enrichmentRequests={} enriched={}",
        SOURCE,
        enriched.size(),
        requests,
        enrichedCount);
    return enriched;
  }

  private GeoapifyPlacesResponse.Feature fetchDetails(String placeId) {
    try {
      return client.placeDetails(placeId).stream()
          .filter(feature -> feature.properties() != null)
          .filter(feature -> "details".equals(feature.properties().featureType()))
          .findFirst()
          .orElse(null);
    } catch (RuntimeException e) {
      log.warn(
          "lead_discovery_details_enrichment_failed provider={} placeId=\"{}\" error=\"{}\"",
          SOURCE,
          placeId,
          e.getMessage());
      return null;
    }
  }

  private LeadCandidate map(GeoapifyPlacesResponse.Feature feature, String category) {
    var properties = feature.properties();
    var geometry = feature.geometry();
    var coordinates = geometry == null ? null : geometry.coordinates();
    Double longitude = coordinates == null || coordinates.size() < 1 ? null : coordinates.get(0);
    Double latitude = coordinates == null || coordinates.size() < 2 ? null : coordinates.get(1);
    var categories = properties == null ? List.of(category) : nonNull(properties.categories());
    return new LeadCandidate(
        SOURCE,
        properties == null ? null : properties.placeId(),
        properties == null ? null : properties.name(),
        categories,
        properties == null ? null : properties.formatted(),
        phone(properties),
        website(properties),
        latitude,
        longitude,
        properties == null ? null : properties.distance());
  }

  private LeadCandidate merge(LeadCandidate existing, LeadCandidate details) {
    return new LeadCandidate(
        first(existing.source(), details.source()),
        first(existing.sourcePlaceId(), details.sourcePlaceId()),
        first(existing.businessName(), details.businessName()),
        existing.categories().isEmpty() ? details.categories() : existing.categories(),
        first(existing.address(), details.address()),
        first(existing.phoneNumber(), details.phoneNumber()),
        first(existing.website(), details.website()),
        first(existing.latitude(), details.latitude()),
        first(existing.longitude(), details.longitude()),
        first(existing.distanceMeters(), details.distanceMeters()));
  }

  private String phone(GeoapifyPlacesResponse.Properties properties) {
    if (properties == null) return null;
    if (properties.contact() != null && properties.contact().phone() != null) {
      return properties.contact().phone();
    }
    return properties.phone();
  }

  private String website(GeoapifyPlacesResponse.Properties properties) {
    if (properties == null) return null;
    if (properties.contact() != null && properties.contact().website() != null) {
      return properties.contact().website();
    }
    return properties.website();
  }

  private List<String> nonNull(List<String> values) {
    return values == null ? List.of() : values;
  }

  private boolean needsContactEnrichment(LeadCandidate candidate) {
    return candidate.phoneNumber() == null
        || candidate.phoneNumber().isBlank()
        || candidate.website() == null
        || candidate.website().isBlank();
  }

  private boolean hasPlaceId(LeadCandidate candidate) {
    return candidate.sourcePlaceId() != null && !candidate.sourcePlaceId().isBlank();
  }

  private boolean hasNewContactData(LeadCandidate before, LeadCandidate after) {
    return isMissing(before.phoneNumber()) && !isMissing(after.phoneNumber())
        || isMissing(before.website()) && !isMissing(after.website());
  }

  private boolean isMissing(String value) {
    return value == null || value.isBlank();
  }

  private <T> T first(T preferred, T fallback) {
    if (preferred instanceof String text) {
      return text.isBlank() ? fallback : preferred;
    }
    return preferred == null ? fallback : preferred;
  }

  private boolean matchesCategory(GeoapifyPlacesResponse.Feature feature, String category) {
    return categories(feature).stream().anyMatch(category::equals);
  }

  private List<String> categories(GeoapifyPlacesResponse.Feature feature) {
    return feature == null || feature.properties() == null
        ? List.of()
        : nonNull(feature.properties().categories());
  }

  private String placeId(GeoapifyPlacesResponse.Feature feature) {
    return feature == null || feature.properties() == null ? null : feature.properties().placeId();
  }

  private String businessName(GeoapifyPlacesResponse.Feature feature) {
    return feature == null || feature.properties() == null ? null : feature.properties().name();
  }
}

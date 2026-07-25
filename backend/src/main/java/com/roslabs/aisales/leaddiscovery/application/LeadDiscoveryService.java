package com.roslabs.aisales.leaddiscovery.application;

import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.LeadResponse;
import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.SearchRequest;
import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.WebsiteFilter;
import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import java.util.List;
import org.slf4j.*;
import org.springframework.stereotype.Service;

@Service
public class LeadDiscoveryService {
  private static final Logger log = LoggerFactory.getLogger(LeadDiscoveryService.class);

  private final LeadDiscoveryProvider provider;
  private final LeadScoringService scoring;
  private final LeadDiscoveryProperties properties;

  public LeadDiscoveryService(
      LeadDiscoveryProvider provider,
      LeadScoringService scoring,
      LeadDiscoveryProperties properties) {
    this.provider = provider;
    this.scoring = scoring;
    this.properties = properties;
  }

  public List<LeadResponse> search(SearchRequest request) {
    int maximumResults =
        Math.min(
            request.maximumResults() == null
                ? properties.maximumResultsPerSearch()
                : request.maximumResults(),
            properties.maximumResultsPerSearch());

    log.info(
        "lead_discovery_search_started provider={} category=\"{}\" location=\"{}\" radiusMeters={} maximumResults={}",
        provider.source(),
        request.category(),
        request.location(),
        request.radiusMeters(),
        maximumResults);

    var results =
        provider
            .search(request.category(), request.location(), request.radiusMeters(), maximumResults)
            .stream()
            .filter(candidate -> passesFilters(candidate, request))
            .limit(maximumResults)
            .map(candidate -> map(candidate, request.category()))
            .toList();

    log.info(
        "lead_discovery_search_completed provider={} category=\"{}\" location=\"{}\" returned={}",
        provider.source(),
        request.category(),
        request.location(),
        results.size());

    return results;
  }

  private LeadResponse map(LeadCandidate candidate, String requestedCategory) {
    var score = scoring.score(candidate, requestedCategory);
    return new LeadResponse(
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

  private boolean passesFilters(LeadCandidate candidate, SearchRequest request) {
    if (request.phoneRequired()
        && (candidate.phoneNumber() == null || candidate.phoneNumber().isBlank())) {
      return false;
    }
    var websiteFilter =
        request.websiteFilter() == null ? WebsiteFilter.ANY : request.websiteFilter();
    boolean hasWebsite = candidate.website() != null && !candidate.website().isBlank();
    return switch (websiteFilter) {
      case ANY -> true;
      case HAS_WEBSITE -> hasWebsite;
      case NO_WEBSITE -> !hasWebsite;
    };
  }
}

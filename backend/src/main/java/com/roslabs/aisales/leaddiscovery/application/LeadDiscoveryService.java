package com.roslabs.aisales.leaddiscovery.application;

import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.LeadResponse;
import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.SearchRequest;
import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import java.util.List;
import org.slf4j.*;
import org.springframework.stereotype.Service;

@Service
public class LeadDiscoveryService {
  private static final Logger log = LoggerFactory.getLogger(LeadDiscoveryService.class);

  private final LeadDiscoveryOrchestrator orchestrator;
  private final LeadDiscoveryProperties properties;

  public LeadDiscoveryService(
      LeadDiscoveryOrchestrator orchestrator, LeadDiscoveryProperties properties) {
    this.orchestrator = orchestrator;
    this.properties = properties;
  }

  public List<LeadResponse> search(SearchRequest request) {
    return orchestrator.discover(normalize(request)).stream().map(this::map).toList();
  }

  private SearchRequest normalize(SearchRequest request) {
    int maximumResults =
        Math.min(
            request.maximumResults() == null
                ? properties.maximumResultsPerSearch()
                : request.maximumResults(),
            properties.maximumResultsPerSearch());
    log.info(
        "lead_discovery_request_normalized requestedMaximumResults={} configuredMaximumResults={} effectiveMaximumResults={}",
        request.maximumResults(),
        properties.maximumResultsPerSearch(),
        maximumResults);
    return new SearchRequest(
        request.category(),
        request.location(),
        request.radiusMeters(),
        maximumResults,
        request.phoneRequired(),
        request.websiteFilter());
  }

  private LeadResponse map(DiscoveredLead lead) {
    return new LeadResponse(
        lead.source(),
        lead.sourcePlaceId(),
        lead.businessName(),
        lead.categories(),
        lead.address(),
        lead.phoneNumber(),
        lead.website(),
        lead.latitude(),
        lead.longitude(),
        lead.distanceMeters(),
        lead.leadScore(),
        lead.qualification(),
        lead.qualificationReasons());
  }
}

package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.configuration.BusinessIntelligenceProperties;
import com.roslabs.aisales.businessintelligence.domain.*;
import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.SearchRequest;
import com.roslabs.aisales.leaddiscovery.application.LeadDiscoveryOrchestrator;
import io.micrometer.core.instrument.*;
import java.util.*;
import org.slf4j.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class BusinessIntelligenceDiscoveryService {
  private static final Logger log = LoggerFactory.getLogger(BusinessIntelligenceDiscoveryService.class);

  private final LeadDiscoveryOrchestrator discovery;
  private final CanonicalBusinessRepository businesses;
  private final EnrichmentJobRepository jobs;
  private final EnrichmentStatusRepository statuses;
  private final SearchHistoryRepository history;
  private final SearchResultCache cache;
  private final BusinessIntelligenceProperties properties;
  private final ApplicationEventPublisher events;
  private final Counter searches;
  private final Counter queuedJobs;

  public BusinessIntelligenceDiscoveryService(
      LeadDiscoveryOrchestrator discovery,
      CanonicalBusinessRepository businesses,
      EnrichmentJobRepository jobs,
      EnrichmentStatusRepository statuses,
      SearchHistoryRepository history,
      SearchResultCache cache,
      BusinessIntelligenceProperties properties,
      ApplicationEventPublisher events,
      MeterRegistry registry) {
    this.discovery = discovery;
    this.businesses = businesses;
    this.jobs = jobs;
    this.statuses = statuses;
    this.history = history;
    this.cache = cache;
    this.properties = properties;
    this.events = events;
    searches = Counter.builder("business_intelligence.searches").register(registry);
    queuedJobs = Counter.builder("business_intelligence.enrichment.jobs.queued").register(registry);
  }

  public BusinessDiscoveryResult discover(BusinessDiscoveryRequest request) {
    var cacheKey = cacheKey(request);
    var cached = cache.get(cacheKey);
    if (cached.isPresent()) return cached.get();

    searches.increment();
    var leads =
        discovery.discover(
            new SearchRequest(
                request.category(),
                request.location(),
                request.radiusMeters(),
                request.maximumResults(),
                request.phoneRequired(),
                request.websiteFilter()));
    var ids = new ArrayList<String>();
    int queued = 0;
    for (var lead : leads) {
      var business =
          businesses
              .findBySource(lead.source(), lead.sourcePlaceId())
              .orElseGet(CanonicalBusiness::new);
      business.mergeDiscovery(
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
          lead.qualification().name(),
          lead.qualificationReasons());
      business = businesses.save(business);
      var businessId = business.getId();
      ids.add(businessId);
      events.publishEvent(new BusinessDiscoveredEvent(businessId));
      if (!jobs.existsOpenJobForBusiness(businessId)) {
        jobs.save(new EnrichmentJob(businessId, properties.maxAttempts()));
        statuses
            .findByBusinessId(businessId)
            .orElseGet(() -> statuses.save(new EnrichmentStatus(businessId, EnrichmentStepRegistry.names())));
        queued++;
        queuedJobs.increment();
      }
    }
    var savedHistory =
        history.save(
            new SearchHistory(
                request.category(),
                request.location(),
                request.radiusMeters(),
                request.maximumResults(),
                leads.size(),
                ids.size(),
                ids));
    var result = new BusinessDiscoveryResult(savedHistory.getId(), leads.size(), ids.size(), queued, ids);
    cache.put(cacheKey, result);
    log.info(
        "business_intelligence_search_completed searchId={} discovered={} persisted={} queuedJobs={}",
        result.searchId(),
        result.discoveredCount(),
        result.persistedCount(),
        result.queuedJobs());
    return result;
  }

  private String cacheKey(BusinessDiscoveryRequest request) {
    return String.join(
        "|",
        request.category().toLowerCase(Locale.ROOT),
        request.location().toLowerCase(Locale.ROOT),
        String.valueOf(request.radiusMeters()),
        String.valueOf(request.maximumResults()),
        String.valueOf(request.phoneRequired()),
        String.valueOf(request.websiteFilter()));
  }
}

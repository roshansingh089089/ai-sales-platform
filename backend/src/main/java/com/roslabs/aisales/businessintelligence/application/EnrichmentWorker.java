package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.configuration.BusinessIntelligenceProperties;
import com.roslabs.aisales.businessintelligence.domain.*;
import io.micrometer.core.instrument.*;
import java.util.*;
import org.slf4j.*;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class EnrichmentWorker {
  private static final Logger log = LoggerFactory.getLogger(EnrichmentWorker.class);

  private final EnrichmentJobRepository jobs;
  private final CanonicalBusinessRepository businesses;
  private final EnrichmentStatusRepository statuses;
  private final BusinessSnapshotRepository snapshots;
  private final List<EnrichmentStep> steps;
  private final BusinessIntelligenceProperties properties;
  private final ApplicationEventPublisher events;
  private final Counter completedJobs;

  public EnrichmentWorker(
      EnrichmentJobRepository jobs,
      CanonicalBusinessRepository businesses,
      EnrichmentStatusRepository statuses,
      BusinessSnapshotRepository snapshots,
      List<EnrichmentStep> steps,
      BusinessIntelligenceProperties properties,
      ApplicationEventPublisher events,
      MeterRegistry registry) {
    this.jobs = jobs;
    this.businesses = businesses;
    this.statuses = statuses;
    this.snapshots = snapshots;
    this.steps = steps;
    this.properties = properties;
    this.events = events;
    completedJobs = Counter.builder("business_intelligence.enrichment.jobs.completed").register(registry);
  }

  public int runBatch() {
    if (!properties.workerEnabled()) return 0;
    var claimed = jobs.claimQueued(properties.workerBatchSize());
    for (var job : claimed) run(job);
    return claimed.size();
  }

  private void run(EnrichmentJob job) {
    job.running();
    jobs.save(job);
    var business = businesses.findById(job.getBusinessId());
    if (business.isEmpty()) {
      job.fail("Business not found");
      jobs.save(job);
      return;
    }
    var current = business.get();
    var businessId = current.getId();
    current.markStatus(BusinessIntelligenceStatus.ENRICHING);
    businesses.save(current);
    var status =
        statuses
            .findByBusinessId(businessId)
            .orElseGet(() -> statuses.save(new EnrichmentStatus(businessId, EnrichmentStepRegistry.names())));
    for (var step : steps) {
      try {
        status.markRunning(step.name());
        statuses.save(status);
        var result = step.execute(current);
        status.markCompleted(step.name());
        statuses.save(status);
        events.publishEvent(
            new EnrichmentProgressEvent(
                current.getId(), status.getStatus(), status.getCompletedSteps(), status.getTotalSteps()));
        log.info(
            "business_intelligence_enrichment_step_completed businessId={} step={} changed={} message=\"{}\"",
            current.getId(),
            step.name(),
            result.changed(),
            result.message());
      } catch (RuntimeException e) {
        status.markFailed(step.name(), e.getMessage());
        statuses.save(status);
        job.fail(e.getMessage());
        jobs.save(job);
        return;
      }
    }
    current.markStatus(BusinessIntelligenceStatus.ENRICHED);
    current = businesses.save(current);
    snapshots.save(new BusinessSnapshot(current.getId(), current));
    job.complete();
    jobs.save(job);
    completedJobs.increment();
  }
}

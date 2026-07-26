package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.configuration.BusinessIntelligenceProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class EnrichmentScheduler {
  private final BusinessIntelligenceProperties properties;
  private final EnrichmentWorker worker;

  public EnrichmentScheduler(BusinessIntelligenceProperties properties, EnrichmentWorker worker) {
    this.properties = properties;
    this.worker = worker;
  }

  @Scheduled(fixedDelayString = "${app.business-intelligence.worker-poll-delay:30s}")
  void run() {
    if (properties.schedulerEnabled()) worker.runBatch();
  }
}

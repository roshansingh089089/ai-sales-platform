package com.roslabs.aisales.businessintelligence.configuration;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.business-intelligence")
public record BusinessIntelligenceProperties(
    boolean workerEnabled,
    boolean schedulerEnabled,
    Duration searchCacheTtl,
    int searchCacheMaxEntries,
    int workerBatchSize,
    int maxAttempts,
    Duration workerPollDelay) {}

package com.roslabs.aisales.leaddiscovery.configuration;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.lead-discovery")
public record LeadDiscoveryProperties(
    String geoapifyApiKey,
    int maximumResultsPerSearch,
    Duration connectionTimeout,
    Duration readTimeout,
    boolean geoapifyDetailsEnrichmentEnabled,
    int maximumEnrichmentRequestsPerSearch) {}

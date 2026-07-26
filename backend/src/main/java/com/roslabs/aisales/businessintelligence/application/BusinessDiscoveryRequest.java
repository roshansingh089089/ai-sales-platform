package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.WebsiteFilter;

public record BusinessDiscoveryRequest(
    String category,
    String location,
    int radiusMeters,
    int maximumResults,
    boolean phoneRequired,
    WebsiteFilter websiteFilter) {}

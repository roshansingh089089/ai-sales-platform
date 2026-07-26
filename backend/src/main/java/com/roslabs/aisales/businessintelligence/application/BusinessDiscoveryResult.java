package com.roslabs.aisales.businessintelligence.application;

import java.util.List;

public record BusinessDiscoveryResult(
    String searchId, int discoveredCount, int persistedCount, int queuedJobs, List<String> businessIds) {}

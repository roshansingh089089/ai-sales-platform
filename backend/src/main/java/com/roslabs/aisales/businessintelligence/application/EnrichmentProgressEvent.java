package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.BusinessIntelligenceStatus;

public record EnrichmentProgressEvent(
    String businessId, BusinessIntelligenceStatus status, int completedSteps, int totalSteps) {}

package com.roslabs.aisales.businessintelligence.domain;

public record StepProgress(String stepName, EnrichmentStepStatus status, String message) {}

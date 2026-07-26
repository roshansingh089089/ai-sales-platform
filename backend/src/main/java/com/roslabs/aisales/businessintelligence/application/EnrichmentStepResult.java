package com.roslabs.aisales.businessintelligence.application;

public record EnrichmentStepResult(boolean changed, String message) {
  public static EnrichmentStepResult unchanged(String message) {
    return new EnrichmentStepResult(false, message);
  }
}

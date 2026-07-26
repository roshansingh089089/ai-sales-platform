package com.roslabs.aisales.businessintelligence.domain;

public enum EnrichmentJobStatus {
  QUEUED,
  RUNNING,
  COMPLETED,
  FAILED,
  RETRYABLE_FAILED
}

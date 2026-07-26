package com.roslabs.aisales.businessintelligence.domain;

import java.time.Instant;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("business_enrichment_jobs")
public class EnrichmentJob {
  @Id private String id;
  @Indexed private String businessId;
  @Indexed private EnrichmentJobStatus status = EnrichmentJobStatus.QUEUED;
  private int attempts;
  private int maxAttempts;
  private String lastError;
  private Instant createdAt;
  private Instant updatedAt;

  public EnrichmentJob() {}

  public EnrichmentJob(String businessId, int maxAttempts) {
    this.businessId = businessId;
    this.maxAttempts = maxAttempts;
  }

  public String getId() { return id; }
  public String getBusinessId() { return businessId; }
  public EnrichmentJobStatus getStatus() { return status; }
  public int getAttempts() { return attempts; }
  public int getMaxAttempts() { return maxAttempts; }
  public String getLastError() { return lastError; }
  public Instant getCreatedAt() { return createdAt; }
  public Instant getUpdatedAt() { return updatedAt; }

  public void touch() {
    var now = Instant.now();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }

  public void running() {
    attempts++;
    status = EnrichmentJobStatus.RUNNING;
  }

  public void complete() {
    status = EnrichmentJobStatus.COMPLETED;
    lastError = null;
  }

  public void fail(String error) {
    lastError = error;
    status = attempts < maxAttempts ? EnrichmentJobStatus.RETRYABLE_FAILED : EnrichmentJobStatus.FAILED;
  }
}

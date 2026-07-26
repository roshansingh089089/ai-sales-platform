package com.roslabs.aisales.businessintelligence.domain;

import java.time.Instant;
import java.util.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("business_enrichment_status")
public class EnrichmentStatus {
  @Id private String id;
  @Indexed(unique = true) private String businessId;
  private BusinessIntelligenceStatus status = BusinessIntelligenceStatus.ENRICHMENT_QUEUED;
  private int completedSteps;
  private int totalSteps;
  private List<StepProgress> steps = new ArrayList<>();
  private String lastError;
  private Instant updatedAt;

  public EnrichmentStatus() {}

  public EnrichmentStatus(String businessId, List<String> stepNames) {
    this.businessId = businessId;
    totalSteps = stepNames.size();
    steps = stepNames.stream().map(name -> new StepProgress(name, EnrichmentStepStatus.PENDING, null)).toList();
  }

  public String getId() {
    return id;
  }

  public String getBusinessId() {
    return businessId;
  }

  public BusinessIntelligenceStatus getStatus() {
    return status;
  }

  public int getCompletedSteps() {
    return completedSteps;
  }

  public int getTotalSteps() {
    return totalSteps;
  }

  public List<StepProgress> getSteps() {
    return steps;
  }

  public String getLastError() {
    return lastError;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void touch() {
    updatedAt = Instant.now();
  }

  public void markRunning(String step) {
    status = BusinessIntelligenceStatus.ENRICHING;
    updateStep(step, EnrichmentStepStatus.RUNNING, null);
  }

  public void markCompleted(String step) {
    updateStep(step, EnrichmentStepStatus.COMPLETED, null);
    completedSteps = (int) steps.stream().filter(s -> s.status() == EnrichmentStepStatus.COMPLETED).count();
    if (completedSteps >= totalSteps) status = BusinessIntelligenceStatus.ENRICHED;
  }

  public void markFailed(String step, String error) {
    lastError = error;
    status = BusinessIntelligenceStatus.PARTIALLY_ENRICHED;
    updateStep(step, EnrichmentStepStatus.FAILED, error);
  }

  private void updateStep(String step, EnrichmentStepStatus state, String message) {
    steps =
        steps.stream()
            .map(existing -> existing.stepName().equals(step) ? new StepProgress(step, state, message) : existing)
            .toList();
  }
}

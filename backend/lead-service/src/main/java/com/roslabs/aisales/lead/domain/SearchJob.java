package com.roslabs.aisales.lead.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.*;
import lombok.*;

@Entity
@Table(name = "search_jobs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SearchJob {
  @Id private UUID id;

  @Column(nullable = false)
  private String query;

  @Column(nullable = false)
  private String location;

  @Column(nullable = false)
  private int maxResults;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SearchJobStatus status;

  @Column(nullable = false)
  private int progressPercentage;

  @Column(nullable = false)
  private int resultCount;

  @Column(nullable = false)
  private int duplicateCount;

  private String failureCode;
  private String failureMessage;
  private String idempotencyKey;

  @Column(nullable = false)
  private Instant createdAt;

  private Instant startedAt;
  private Instant completedAt;
  private Instant updatedAt;

  @OneToMany(mappedBy = "job", cascade = CascadeType.ALL, orphanRemoval = true)
  @OrderBy("createdAt ASC")
  private List<SearchJobStatusHistory> statusHistory = new ArrayList<>();

  @Version private long version;

  public SearchJob(String query, String location, int maxResults, String idempotencyKey) {
    id = UUID.randomUUID();
    this.query = query;
    this.location = location;
    this.maxResults = maxResults;
    this.idempotencyKey = idempotencyKey;
    status = SearchJobStatus.QUEUED;
    progressPercentage = 0;
    createdAt = Instant.now();
    updatedAt = createdAt;
    addHistory(SearchJobStatus.QUEUED, "Search job queued");
  }

  public void transitionTo(SearchJobStatus next, String message) {
    if (status == SearchJobStatus.COMPLETED || status == SearchJobStatus.FAILED) {
      throw new IllegalStateException("Terminal search job cannot transition");
    }
    if (next == SearchJobStatus.FAILED) {
      status = next;
      failureCode = "AUTOMATION_FAILED";
      failureMessage = message;
      completedAt = Instant.now();
      progressPercentage = 100;
      updatedAt = completedAt;
      addHistory(next, message);
      return;
    }
    if (!allowed(status, next)) {
      throw new IllegalStateException("Invalid search job transition: " + status + " -> " + next);
    }
    status = next;
    if (next == SearchJobStatus.BROWSER_STARTING && startedAt == null) startedAt = Instant.now();
    if (next == SearchJobStatus.COMPLETED) {
      completedAt = Instant.now();
      progressPercentage = 100;
    } else {
      progressPercentage = progressFor(next);
    }
    updatedAt = Instant.now();
    addHistory(next, message);
  }

  public void completeImport(int resultCount, int duplicateCount) {
    this.resultCount = resultCount;
    this.duplicateCount = duplicateCount;
    transitionTo(SearchJobStatus.COMPLETED, "Import completed");
  }

  private boolean allowed(SearchJobStatus current, SearchJobStatus next) {
    return switch (current) {
      case QUEUED -> next == SearchJobStatus.BROWSER_STARTING;
      case BROWSER_STARTING -> next == SearchJobStatus.SEARCHING;
      case SEARCHING -> next == SearchJobStatus.EXPORTING;
      case EXPORTING -> next == SearchJobStatus.DOWNLOADING;
      case DOWNLOADING -> next == SearchJobStatus.IMPORTING;
      case IMPORTING -> next == SearchJobStatus.COMPLETED;
      case COMPLETED, FAILED -> false;
    };
  }

  private int progressFor(SearchJobStatus status) {
    return switch (status) {
      case QUEUED -> 0;
      case BROWSER_STARTING -> 10;
      case SEARCHING -> 30;
      case EXPORTING -> 55;
      case DOWNLOADING -> 70;
      case IMPORTING -> 85;
      case COMPLETED, FAILED -> 100;
    };
  }

  private void addHistory(SearchJobStatus status, String message) {
    statusHistory.add(new SearchJobStatusHistory(this, status, message));
  }
}

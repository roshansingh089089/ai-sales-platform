package com.roslabs.aisales.lead.domain;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "search_job_status_history")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SearchJobStatusHistory {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "search_job_id", nullable = false)
  @JsonIgnore
  private SearchJob job;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private SearchJobStatus status;

  private String message;

  @Column(nullable = false)
  private Instant createdAt;

  public SearchJobStatusHistory(SearchJob job, SearchJobStatus status, String message) {
    id = UUID.randomUUID();
    this.job = job;
    this.status = status;
    this.message = message;
    createdAt = Instant.now();
  }
}

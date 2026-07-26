package com.roslabs.aisales.lead.domain;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "lead_import_batches")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeadImportBatch {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "search_job_id", nullable = false)
  @JsonIgnore
  private SearchJob job;

  @Column(nullable = false)
  private String provider;

  @Column(nullable = false)
  private String originalFilename;

  @Column(nullable = false)
  private String checksum;

  private Integer declaredRecordCount;

  @Column(nullable = false)
  private int acceptedRows;

  @Column(nullable = false)
  private int rejectedRows;

  @Column(nullable = false)
  private Instant createdAt;

  public LeadImportBatch(
      SearchJob job,
      String provider,
      String originalFilename,
      String checksum,
      Integer declaredRecordCount,
      int acceptedRows,
      int rejectedRows) {
    id = UUID.randomUUID();
    this.job = job;
    this.provider = provider;
    this.originalFilename = originalFilename;
    this.checksum = checksum;
    this.declaredRecordCount = declaredRecordCount;
    this.acceptedRows = acceptedRows;
    this.rejectedRows = rejectedRows;
    createdAt = Instant.now();
  }

  public void complete(int acceptedRows, int rejectedRows) {
    this.acceptedRows = acceptedRows;
    this.rejectedRows = rejectedRows;
  }
}

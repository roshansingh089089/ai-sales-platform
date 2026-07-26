package com.roslabs.aisales.lead.domain;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Entity
@Table(name = "lead_search_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LeadSearchResult {
  @Id private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "search_job_id", nullable = false)
  @JsonIgnore
  private SearchJob job;

  @Column(nullable = false)
  private UUID businessId;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "import_batch_id", nullable = false)
  @JsonIgnore
  private LeadImportBatch importBatch;

  @Column(nullable = false)
  private String provider;

  private String sourceExternalId;

  @Column(nullable = false)
  private String businessName;

  private String category;
  private String city;

  @Column(nullable = false)
  private boolean hasPhone;

  @Column(nullable = false)
  private boolean hasEmail;

  @Column(nullable = false)
  private boolean hasWebsite;

  @Column(nullable = false)
  private Instant createdAt;

  public LeadSearchResult(
      SearchJob job,
      UUID businessId,
      LeadImportBatch importBatch,
      String provider,
      String sourceExternalId,
      String businessName,
      String category,
      String city,
      boolean hasPhone,
      boolean hasEmail,
      boolean hasWebsite) {
    id = UUID.randomUUID();
    this.job = job;
    this.businessId = businessId;
    this.importBatch = importBatch;
    this.provider = provider;
    this.sourceExternalId = sourceExternalId;
    this.businessName = businessName;
    this.category = category;
    this.city = city;
    this.hasPhone = hasPhone;
    this.hasEmail = hasEmail;
    this.hasWebsite = hasWebsite;
    createdAt = Instant.now();
  }
}

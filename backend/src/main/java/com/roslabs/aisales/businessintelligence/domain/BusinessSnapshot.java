package com.roslabs.aisales.businessintelligence.domain;

import java.time.Instant;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("business_snapshots")
public class BusinessSnapshot {
  @Id private String id;
  @Indexed private String businessId;
  private CanonicalBusiness business;
  private Instant createdAt;

  public BusinessSnapshot(String businessId, CanonicalBusiness business) {
    this.businessId = businessId;
    this.business = business;
  }

  public void touch() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public String getId() { return id; }
  public String getBusinessId() { return businessId; }
  public CanonicalBusiness getBusiness() { return business; }
  public Instant getCreatedAt() { return createdAt; }
}

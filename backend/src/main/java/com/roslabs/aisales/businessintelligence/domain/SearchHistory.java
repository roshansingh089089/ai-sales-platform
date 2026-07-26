package com.roslabs.aisales.businessintelligence.domain;

import java.time.Instant;
import java.util.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("business_search_history")
public class SearchHistory {
  @Id private String id;
  @Indexed private String category;
  private String location;
  private int radiusMeters;
  private int maximumResults;
  private int discoveredCount;
  private int persistedCount;
  private List<String> businessIds = new ArrayList<>();
  private Instant createdAt;

  public SearchHistory(
      String category,
      String location,
      int radiusMeters,
      int maximumResults,
      int discoveredCount,
      int persistedCount,
      List<String> businessIds) {
    this.category = category;
    this.location = location;
    this.radiusMeters = radiusMeters;
    this.maximumResults = maximumResults;
    this.discoveredCount = discoveredCount;
    this.persistedCount = persistedCount;
    this.businessIds = businessIds;
  }

  public void touch() {
    if (createdAt == null) createdAt = Instant.now();
  }

  public String getId() { return id; }
  public String getCategory() { return category; }
  public String getLocation() { return location; }
  public int getRadiusMeters() { return radiusMeters; }
  public int getMaximumResults() { return maximumResults; }
  public int getDiscoveredCount() { return discoveredCount; }
  public int getPersistedCount() { return persistedCount; }
  public List<String> getBusinessIds() { return businessIds; }
  public Instant getCreatedAt() { return createdAt; }
}

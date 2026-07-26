package com.roslabs.aisales.businessintelligence.domain;

import java.time.Instant;
import java.util.*;
import org.springframework.data.annotation.*;
import org.springframework.data.mongodb.core.index.*;
import org.springframework.data.mongodb.core.mapping.Document;

@Document("businesses_canonical")
@CompoundIndex(name = "source_ref_idx", def = "{'sources.source': 1, 'sources.sourcePlaceId': 1}")
public class CanonicalBusiness {
  @Id private String id;
  @Indexed private String normalizedName;
  private String businessName;
  private List<String> categories = new ArrayList<>();
  private String address;
  private String phoneNumber;
  private String website;
  private Double latitude;
  private Double longitude;
  private Integer distanceMeters;
  private int leadScore;
  private String qualification;
  private List<String> qualificationReasons = new ArrayList<>();
  private BusinessIntelligenceStatus status = BusinessIntelligenceStatus.DISCOVERED;
  private List<BusinessSourceRef> sources = new ArrayList<>();
  private Instant createdAt;
  private Instant updatedAt;

  public String getId() {
    return id;
  }

  public String getBusinessName() {
    return businessName;
  }

  public List<String> getCategories() {
    return categories;
  }

  public String getAddress() {
    return address;
  }

  public String getPhoneNumber() {
    return phoneNumber;
  }

  public String getWebsite() {
    return website;
  }

  public Double getLatitude() {
    return latitude;
  }

  public Double getLongitude() {
    return longitude;
  }

  public Integer getDistanceMeters() {
    return distanceMeters;
  }

  public int getLeadScore() {
    return leadScore;
  }

  public String getQualification() {
    return qualification;
  }

  public List<String> getQualificationReasons() {
    return qualificationReasons;
  }

  public BusinessIntelligenceStatus getStatus() {
    return status;
  }

  public List<BusinessSourceRef> getSources() {
    return sources;
  }

  public Instant getCreatedAt() {
    return createdAt;
  }

  public Instant getUpdatedAt() {
    return updatedAt;
  }

  public void touch() {
    var now = Instant.now();
    if (createdAt == null) createdAt = now;
    updatedAt = now;
  }

  public void mergeDiscovery(
      String source,
      String sourcePlaceId,
      String businessName,
      List<String> categories,
      String address,
      String phoneNumber,
      String website,
      Double latitude,
      Double longitude,
      Integer distanceMeters,
      int leadScore,
      String qualification,
      List<String> qualificationReasons) {
    this.businessName = first(this.businessName, businessName);
    normalizedName = normalize(this.businessName);
    mergeCategories(categories);
    this.address = first(this.address, address);
    this.phoneNumber = first(this.phoneNumber, phoneNumber);
    this.website = first(this.website, website);
    this.latitude = first(this.latitude, latitude);
    this.longitude = first(this.longitude, longitude);
    this.distanceMeters = first(this.distanceMeters, distanceMeters);
    this.leadScore = Math.max(this.leadScore, leadScore);
    this.qualification = first(this.qualification, qualification);
    this.qualificationReasons = qualificationReasons == null ? List.of() : List.copyOf(qualificationReasons);
    addSource(source, sourcePlaceId);
    if (status == BusinessIntelligenceStatus.DISCOVERED) status = BusinessIntelligenceStatus.ENRICHMENT_QUEUED;
  }

  public void markStatus(BusinessIntelligenceStatus status) {
    this.status = status;
  }

  private void mergeCategories(List<String> values) {
    var merged = new LinkedHashSet<>(categories == null ? List.<String>of() : categories);
    if (values != null) merged.addAll(values);
    categories = List.copyOf(merged);
  }

  private void addSource(String source, String sourcePlaceId) {
    if (source == null || sourcePlaceId == null) return;
    boolean exists =
        sources.stream()
            .anyMatch(ref -> source.equals(ref.source()) && sourcePlaceId.equals(ref.sourcePlaceId()));
    if (!exists) sources.add(new BusinessSourceRef(source, sourcePlaceId));
  }

  private <T> T first(T preferred, T fallback) {
    if (preferred instanceof String value) return value.isBlank() ? fallback : preferred;
    return preferred == null ? fallback : preferred;
  }

  private String normalize(String value) {
    return value == null ? null : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }
}

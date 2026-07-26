package com.roslabs.aisales.businessservice.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;
import lombok.*;

@Entity
@Table(
    name = "canonical_businesses",
    uniqueConstraints = @UniqueConstraint(name = "uq_business_source_ref", columnNames = {"source", "source_ref"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CanonicalBusiness {
  @Id private UUID id;

  @Column(nullable = false)
  private String name;

  private String normalizedName;
  private String website;
  private String normalizedWebsiteDomain;
  private String phoneNumber;
  private String normalizedPhoneNumber;
  private String email;
  private String address;
  private String normalizedAddress;
  private String city;
  private String state;
  private String country;
  private String postalCode;
  private String category;
  private String source;
  private String sourceRef;
  private String sourceUrl;
  private Double rating;
  private Integer reviewCount;
  private Double latitude;
  private Double longitude;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private BusinessStatus status;

  @Column(nullable = false)
  private Instant createdAt;

  private Instant updatedAt;
  private String createdBy;
  private String updatedBy;

  @Version private long version;

  public CanonicalBusiness(
      String name,
      String website,
      String phoneNumber,
      String email,
      String address,
      String city,
      String state,
      String country,
      String postalCode,
      String category,
      String source,
      String sourceRef,
      String sourceUrl,
      Double rating,
      Integer reviewCount,
      Double latitude,
      Double longitude,
      String actor) {
    id = UUID.randomUUID();
    this.name = name;
    normalizedName = normalize(name);
    this.website = website;
    normalizedWebsiteDomain = normalizeDomain(website);
    this.phoneNumber = phoneNumber;
    normalizedPhoneNumber = normalizePhone(phoneNumber);
    this.email = email;
    this.address = address;
    normalizedAddress = normalize(address);
    this.city = city;
    this.state = state;
    this.country = country;
    this.postalCode = postalCode;
    this.category = category;
    this.source = source;
    this.sourceRef = sourceRef;
    this.sourceUrl = sourceUrl;
    this.rating = rating;
    this.reviewCount = reviewCount;
    this.latitude = latitude;
    this.longitude = longitude;
    status = BusinessStatus.DISCOVERED;
    createdAt = Instant.now();
    updatedAt = createdAt;
    createdBy = actor;
    updatedBy = actor;
  }

  public void mergeMissingFields(
      String website,
      String phoneNumber,
      String email,
      String address,
      String city,
      String state,
      String country,
      String postalCode,
      String category,
      String sourceUrl,
      Double rating,
      Integer reviewCount,
      Double latitude,
      Double longitude,
      String actor) {
    if (isBlank(this.website) && !isBlank(website)) {
      this.website = website;
      normalizedWebsiteDomain = normalizeDomain(website);
    }
    if (isBlank(this.phoneNumber) && !isBlank(phoneNumber)) {
      this.phoneNumber = phoneNumber;
      normalizedPhoneNumber = normalizePhone(phoneNumber);
    }
    if (isBlank(this.email)) this.email = email;
    if (isBlank(this.address) && !isBlank(address)) {
      this.address = address;
      normalizedAddress = normalize(address);
    }
    if (isBlank(this.city)) this.city = city;
    if (isBlank(this.state)) this.state = state;
    if (isBlank(this.country)) this.country = country;
    if (isBlank(this.postalCode)) this.postalCode = postalCode;
    if (isBlank(this.category)) this.category = category;
    if (isBlank(this.sourceUrl)) this.sourceUrl = sourceUrl;
    if (this.rating == null) this.rating = rating;
    if (this.reviewCount == null) this.reviewCount = reviewCount;
    if (this.latitude == null) this.latitude = latitude;
    if (this.longitude == null) this.longitude = longitude;
    updatedAt = Instant.now();
    updatedBy = actor;
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String normalize(String value) {
    return value == null ? null : value.toLowerCase().replaceAll("[^a-z0-9]+", " ").trim();
  }

  private String normalizePhone(String value) {
    if (value == null) return null;
    var normalized = value.replaceAll("[^0-9+]+", "");
    return normalized.isBlank() ? null : normalized;
  }

  private String normalizeDomain(String value) {
    if (value == null || value.isBlank()) return null;
    var normalized = value.toLowerCase().trim();
    normalized = normalized.replaceFirst("^https?://", "").replaceFirst("^www\\.", "");
    var slash = normalized.indexOf('/');
    if (slash >= 0) normalized = normalized.substring(0, slash);
    return normalized.isBlank() ? null : normalized;
  }
}

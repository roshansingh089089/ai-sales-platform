package com.roslabs.aisales.business.domain;

import com.roslabs.aisales.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "businesses")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Business extends AuditableEntity {
  @Column(nullable = false)
  private String name;

  private String website;
  private String industry;
  private String city;
  private String state;
  private String country;

  @Column(columnDefinition = "text")
  private String description;

  @Enumerated(EnumType.STRING)
  private BusinessSource source;

  @Enumerated(EnumType.STRING)
  private BusinessStatus status;

  public Business(
      String name,
      String website,
      String industry,
      String city,
      String state,
      String country,
      String description) {
    this.name = name;
    this.website = website;
    this.industry = industry;
    this.city = city;
    this.state = state;
    this.country = country;
    this.description = description;
    source = BusinessSource.MANUAL;
    status = BusinessStatus.NEW;
  }

  public void update(
      String name,
      String website,
      String industry,
      String city,
      String state,
      String country,
      String description,
      BusinessStatus status) {
    this.name = name;
    this.website = website;
    this.industry = industry;
    this.city = city;
    this.state = state;
    this.country = country;
    this.description = description;
    this.status = status;
  }

  public void doNotContact() {
    status = BusinessStatus.DO_NOT_CONTACT;
  }
}

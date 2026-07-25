package com.roslabs.aisales.contact.domain;

import com.roslabs.aisales.business.domain.Business;
import com.roslabs.aisales.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "contacts")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Contact extends AuditableEntity {
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Business business;

  @Column(nullable = false)
  private String firstName;

  private String lastName;
  private String designation;
  private String phoneNumber;
  private String email;

  @Enumerated(EnumType.STRING)
  private PreferredContactMethod preferredContactMethod;

  private boolean doNotContact;

  @Column(columnDefinition = "text")
  private String notes;

  public Contact(
      Business business,
      String firstName,
      String lastName,
      String designation,
      String phoneNumber,
      String email,
      PreferredContactMethod method,
      String notes) {
    this.business = business;
    this.firstName = firstName;
    this.lastName = lastName;
    this.designation = designation;
    this.phoneNumber = normalize(phoneNumber);
    this.email = email;
    this.preferredContactMethod = method;
    this.notes = notes;
  }

  public void update(
      String firstName,
      String lastName,
      String designation,
      String phone,
      String email,
      PreferredContactMethod method,
      boolean blocked,
      String notes) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.designation = designation;
    this.phoneNumber = normalize(phone);
    this.email = email;
    this.preferredContactMethod = method;
    this.doNotContact = blocked;
    this.notes = notes;
  }

  public void block() {
    doNotContact = true;
  }

  public String fullName() {
    return (firstName + " " + (lastName == null ? "" : lastName)).trim();
  }

  private static String normalize(String value) {
    return value == null ? null : value.trim().replaceAll("[()\\s-]", "");
  }
}

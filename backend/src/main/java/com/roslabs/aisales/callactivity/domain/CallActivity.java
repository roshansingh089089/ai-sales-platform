package com.roslabs.aisales.callactivity.domain;

import com.roslabs.aisales.business.domain.Business;
import com.roslabs.aisales.callbrief.domain.CallBrief;
import com.roslabs.aisales.contact.domain.Contact;
import com.roslabs.aisales.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity
@Table(name = "call_activities")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CallActivity extends AuditableEntity {
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Business business;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Contact contact;

  @ManyToOne(fetch = FetchType.LAZY)
  private CallBrief callBrief;

  private Instant startedAt;
  private Instant completedAt;

  @Enumerated(EnumType.STRING)
  private CallOutcome outcome;

  @Column(columnDefinition = "text")
  private String summary;

  @Enumerated(EnumType.STRING)
  private CustomerInterest customerInterest;

  private boolean followUpRequired;
  private Instant followUpDate;

  @Column(columnDefinition = "text")
  private String notes;

  public CallActivity(
      Business b,
      Contact c,
      CallBrief brief,
      Instant started,
      Instant completed,
      CallOutcome outcome,
      String summary,
      CustomerInterest interest,
      boolean followUp,
      Instant followUpDate,
      String notes) {
    business = b;
    contact = c;
    callBrief = brief;
    startedAt = started;
    completedAt = completed;
    this.outcome = outcome;
    this.summary = summary;
    customerInterest = interest;
    followUpRequired = followUp;
    this.followUpDate = followUpDate;
    this.notes = notes;
  }

  public boolean needsFollowUp() {
    return followUpRequired
        || outcome == CallOutcome.CALL_BACK_LATER
        || outcome == CallOutcome.INTERESTED
        || outcome == CallOutcome.MEETING_REQUESTED;
  }
}

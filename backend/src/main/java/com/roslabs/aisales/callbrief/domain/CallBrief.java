package com.roslabs.aisales.callbrief.domain;

import com.roslabs.aisales.business.domain.Business;
import com.roslabs.aisales.contact.domain.Contact;
import com.roslabs.aisales.opportunity.domain.Opportunity;
import com.roslabs.aisales.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "call_briefs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CallBrief extends AuditableEntity {
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Business business;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Contact contact;

  @ManyToOne(fetch = FetchType.LAZY)
  private Opportunity opportunity;

  @Column(nullable = false, columnDefinition = "text")
  private String objective;

  @Column(nullable = false, columnDefinition = "text")
  private String introduction;

  @Column(nullable = false, columnDefinition = "text")
  private String keyTalkingPoints;

  @Column(nullable = false, columnDefinition = "text")
  private String discoveryQuestions;

  @Column(nullable = false, columnDefinition = "text")
  private String likelyObjections;

  @Column(nullable = false, columnDefinition = "text")
  private String suggestedResponses;

  @Column(nullable = false, columnDefinition = "text")
  private String nextBestAction;

  @Enumerated(EnumType.STRING)
  private CallBriefStatus status;

  public CallBrief(Business b, Contact c, Opportunity o, GeneratedCallBrief g) {
    business = b;
    contact = c;
    opportunity = o;
    objective = g.objective();
    introduction = g.introduction();
    keyTalkingPoints = g.keyTalkingPoints();
    discoveryQuestions = g.discoveryQuestions();
    likelyObjections = g.likelyObjections();
    suggestedResponses = g.suggestedResponses();
    nextBestAction = g.nextBestAction();
    status = CallBriefStatus.DRAFT;
  }

  public void ready() {
    status = CallBriefStatus.READY;
  }

  public void update(
      String objective,
      String introduction,
      String keyTalkingPoints,
      String discoveryQuestions,
      String likelyObjections,
      String suggestedResponses,
      String nextBestAction) {
    this.objective = objective;
    this.introduction = introduction;
    this.keyTalkingPoints = keyTalkingPoints;
    this.discoveryQuestions = discoveryQuestions;
    this.likelyObjections = likelyObjections;
    this.suggestedResponses = suggestedResponses;
    this.nextBestAction = nextBestAction;
  }
}

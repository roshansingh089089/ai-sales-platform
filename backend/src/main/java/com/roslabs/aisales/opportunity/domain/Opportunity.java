package com.roslabs.aisales.opportunity.domain;

import com.roslabs.aisales.business.domain.Business;
import com.roslabs.aisales.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.*;

@Entity
@Table(name = "opportunities")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Opportunity extends AuditableEntity {
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Business business;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false, columnDefinition = "text")
  private String problemStatement;

  @Column(nullable = false, columnDefinition = "text")
  private String proposedSolution;

  private BigDecimal confidenceScore;

  @Column(columnDefinition = "text")
  private String evidence;

  @Enumerated(EnumType.STRING)
  private OpportunityStatus status;

  public Opportunity(Business b, String t, String p, String s, BigDecimal c, String e) {
    business = b;
    title = t;
    problemStatement = p;
    proposedSolution = s;
    confidenceScore = c;
    evidence = e;
    status = OpportunityStatus.DRAFT;
  }

  public void setStatus(OpportunityStatus status) {
    this.status = status == null ? OpportunityStatus.DRAFT : status;
  }
}

package com.roslabs.aisales.callbrief.application;

import com.roslabs.aisales.callbrief.domain.*;
import com.roslabs.aisales.callbrief.infrastructure.CallBriefRepository;
import com.roslabs.aisales.contact.application.ContactService;
import com.roslabs.aisales.opportunity.application.OpportunityService;
import jakarta.persistence.EntityNotFoundException;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CallBriefService {
  private final CallBriefRepository repository;
  private final ContactService contacts;
  private final OpportunityService opportunities;
  private final CallBriefGenerator generator;

  public CallBriefService(
      CallBriefRepository r, ContactService c, OpportunityService o, CallBriefGenerator g) {
    repository = r;
    contacts = c;
    opportunities = o;
    generator = g;
  }

  @Transactional
  public CallBrief generate(UUID contactId, UUID opportunityId) {
    var c = contacts.get(contactId);
    var o = opportunityId == null ? null : opportunities.get(opportunityId);
    if (o != null && !o.getBusiness().getId().equals(c.getBusiness().getId()))
      throw new IllegalArgumentException("Opportunity belongs to another business");
    var b = c.getBusiness();
    var cmd =
        new GenerateCallBriefCommand(
            b.getName(),
            b.getIndustry(),
            b.getDescription(),
            o == null ? null : o.getProblemStatement(),
            o == null ? null : o.getProposedSolution(),
            c.getDesignation());
    return repository.save(new CallBrief(b, c, o, generator.generate(cmd)));
  }

  @Transactional(readOnly = true)
  public CallBrief get(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Call brief not found"));
  }

  @Transactional
  public CallBrief ready(UUID id) {
    var b = get(id);
    b.ready();
    return b;
  }

  @Transactional
  public CallBrief update(UUID id, GeneratedCallBrief content) {
    var brief = get(id);
    brief.update(
        content.objective(),
        content.introduction(),
        content.keyTalkingPoints(),
        content.discoveryQuestions(),
        content.likelyObjections(),
        content.suggestedResponses(),
        content.nextBestAction());
    return brief;
  }

  @Transactional(readOnly = true)
  public java.util.List<CallBrief> listForBusiness(UUID businessId) {
    return repository.findByBusinessIdOrderByCreatedAtDesc(businessId);
  }
}

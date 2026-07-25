package com.roslabs.aisales.callactivity.application;

import com.roslabs.aisales.business.application.BusinessService;
import com.roslabs.aisales.callactivity.domain.*;
import com.roslabs.aisales.callactivity.infrastructure.CallActivityRepository;
import com.roslabs.aisales.callbrief.application.CallBriefService;
import com.roslabs.aisales.contact.application.ContactService;
import com.roslabs.aisales.task.domain.*;
import com.roslabs.aisales.task.infrastructure.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CallActivityService {
  private final CallActivityRepository repository;
  private final BusinessService businesses;
  private final ContactService contacts;
  private final CallBriefService briefs;
  private final TaskRepository tasks;

  public CallActivityService(
      CallActivityRepository r,
      BusinessService b,
      ContactService c,
      CallBriefService cb,
      TaskRepository t) {
    repository = r;
    businesses = b;
    contacts = c;
    briefs = cb;
    tasks = t;
  }

  @Transactional
  public CallActivity record(
      UUID businessId,
      UUID contactId,
      UUID briefId,
      Instant started,
      Instant completed,
      CallOutcome outcome,
      String summary,
      CustomerInterest interest,
      boolean followUp,
      Instant followUpDate,
      String notes) {
    var b = businesses.get(businessId);
    var c = contacts.get(contactId);
    if (!c.getBusiness().getId().equals(businessId))
      throw new IllegalArgumentException("Contact belongs to another business");
    var brief = briefId == null ? null : briefs.get(briefId);
    var a =
        repository.save(
            new CallActivity(
                b,
                c,
                brief,
                started,
                completed,
                outcome,
                summary,
                interest,
                followUp,
                followUpDate,
                notes));
    if (outcome == CallOutcome.DO_NOT_CONTACT) {
      c.block();
      b.doNotContact();
    }
    if (a.needsFollowUp()) {
      Instant due = followUpDate == null ? Instant.now().plus(1, ChronoUnit.DAYS) : followUpDate;
      tasks.save(
          new Task(
              b,
              c,
              a,
              "Follow up with " + c.fullName(),
              summary,
              due,
              outcome == CallOutcome.MEETING_REQUESTED ? TaskPriority.HIGH : TaskPriority.MEDIUM));
    }
    return a;
  }

  @Transactional(readOnly = true)
  public CallActivity get(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Call activity not found"));
  }

  @Transactional(readOnly = true)
  public List<CallActivity> list(UUID id) {
    businesses.get(id);
    return repository.findByBusinessIdOrderByCreatedAtDesc(id);
  }

  @Transactional(readOnly = true)
  public List<CallActivity> recent() {
    return repository.findTop50ByOrderByCreatedAtDesc();
  }
}

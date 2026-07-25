package com.roslabs.aisales.dashboard.api;

import com.roslabs.aisales.business.infrastructure.BusinessRepository;
import com.roslabs.aisales.callactivity.domain.CallOutcome;
import com.roslabs.aisales.callactivity.infrastructure.CallActivityRepository;
import com.roslabs.aisales.callbrief.domain.CallBriefStatus;
import com.roslabs.aisales.callbrief.infrastructure.CallBriefRepository;
import com.roslabs.aisales.contact.infrastructure.ContactRepository;
import com.roslabs.aisales.task.domain.TaskStatus;
import com.roslabs.aisales.task.infrastructure.TaskRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
  private final BusinessRepository businesses;
  private final ContactRepository contacts;
  private final CallBriefRepository briefs;
  private final CallActivityRepository calls;
  private final TaskRepository tasks;

  public DashboardController(
      BusinessRepository businesses,
      ContactRepository contacts,
      CallBriefRepository briefs,
      CallActivityRepository calls,
      TaskRepository tasks) {
    this.businesses = businesses;
    this.contacts = contacts;
    this.briefs = briefs;
    this.calls = calls;
    this.tasks = tasks;
  }

  public record CallItem(
      UUID callBriefId,
      UUID businessId,
      String businessName,
      UUID contactId,
      String contactName,
      String phoneNumber,
      String objective) {}

  public record OutcomeItem(
      UUID id,
      String businessName,
      String contactName,
      String outcome,
      String interest,
      Instant occurredAt) {}

  public record TaskItem(
      UUID id,
      String title,
      String businessName,
      String contactName,
      Instant dueAt,
      String status) {}

  public record BusinessItem(UUID id, String name, String reason) {}

  public record Summary(
      long totalBusinesses,
      long contactsReady,
      long callBriefsReady,
      long interestedLeads,
      long openTasks,
      List<CallItem> callsToMakeToday,
      List<OutcomeItem> recentCallOutcomes,
      List<TaskItem> followUpTasks,
      List<BusinessItem> businessesRequiringAttention) {}

  @GetMapping("/summary")
  @Transactional(readOnly = true)
  Summary summary() {
    var allContacts = contacts.findAll();
    var readyBriefs =
        briefs.findAll().stream().filter(b -> b.getStatus() == CallBriefStatus.READY).toList();
    var recent = calls.findTop50ByOrderByCreatedAtDesc();
    var activeTasks =
        tasks.findAll().stream()
            .filter(
                t -> t.getStatus() == TaskStatus.OPEN || t.getStatus() == TaskStatus.IN_PROGRESS)
            .toList();
    var callable =
        allContacts.stream()
            .filter(
                c ->
                    !c.isDoNotContact()
                        && c.getPhoneNumber() != null
                        && !c.getPhoneNumber().isBlank()
                        && !"DO_NOT_CONTACT".equals(c.getBusiness().getStatus().name()))
            .toList();
    var callItems =
        readyBriefs.stream()
            .filter(b -> callable.stream().anyMatch(c -> c.getId().equals(b.getContact().getId())))
            .limit(10)
            .map(
                b ->
                    new CallItem(
                        b.getId(),
                        b.getBusiness().getId(),
                        b.getBusiness().getName(),
                        b.getContact().getId(),
                        b.getContact().fullName(),
                        b.getContact().getPhoneNumber(),
                        b.getObjective()))
            .toList();
    var outcomes =
        recent.stream()
            .limit(10)
            .map(
                c ->
                    new OutcomeItem(
                        c.getId(),
                        c.getBusiness().getName(),
                        c.getContact().fullName(),
                        c.getOutcome().name(),
                        c.getCustomerInterest().name(),
                        c.getCreatedAt()))
            .toList();
    var followUps =
        activeTasks.stream()
            .sorted(java.util.Comparator.comparing(com.roslabs.aisales.task.domain.Task::getDueAt))
            .limit(10)
            .map(
                t ->
                    new TaskItem(
                        t.getId(),
                        t.getTitle(),
                        t.getBusiness().getName(),
                        t.getContact() == null ? null : t.getContact().fullName(),
                        t.getDueAt(),
                        t.getStatus().name()))
            .toList();
    var readyContactIds =
        readyBriefs.stream()
            .map(b -> b.getContact().getId())
            .collect(java.util.stream.Collectors.toSet());
    var attention =
        callable.stream()
            .filter(c -> !readyContactIds.contains(c.getId()))
            .map(
                c ->
                    new BusinessItem(
                        c.getBusiness().getId(),
                        c.getBusiness().getName(),
                        "Callable contact has no ready brief"))
            .distinct()
            .limit(10)
            .toList();
    long interested =
        recent.stream()
            .filter(
                c ->
                    c.getOutcome() == CallOutcome.INTERESTED
                        || c.getOutcome() == CallOutcome.MEETING_REQUESTED
                        || "HIGH".equals(c.getCustomerInterest().name()))
            .map(c -> c.getBusiness().getId())
            .distinct()
            .count();
    return new Summary(
        businesses.count(),
        callable.size(),
        readyBriefs.size(),
        interested,
        activeTasks.size(),
        callItems,
        outcomes,
        followUps,
        attention);
  }
}

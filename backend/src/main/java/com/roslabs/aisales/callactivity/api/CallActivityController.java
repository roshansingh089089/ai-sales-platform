package com.roslabs.aisales.callactivity.api;

import com.roslabs.aisales.callactivity.application.CallActivityService;
import com.roslabs.aisales.callactivity.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CallActivityController {
  private final CallActivityService service;

  public CallActivityController(CallActivityService s) {
    service = s;
  }

  public record Request(
      @NotNull UUID businessId,
      @NotNull UUID contactId,
      UUID callBriefId,
      Instant startedAt,
      Instant completedAt,
      @NotNull CallOutcome outcome,
      String summary,
      CustomerInterest customerInterest,
      boolean followUpRequired,
      Instant followUpDate,
      String notes) {}

  public record Response(
      UUID id,
      UUID businessId,
      String businessName,
      UUID contactId,
      String contactName,
      UUID callBriefId,
      Instant startedAt,
      Instant completedAt,
      String outcome,
      String summary,
      String customerInterest,
      boolean followUpRequired,
      Instant followUpDate,
      Instant createdAt) {}

  @PostMapping("/call-activities")
  ResponseEntity<Response> create(@Valid @RequestBody Request r) {
    return ResponseEntity.status(201)
        .body(
            map(
                service.record(
                    r.businessId,
                    r.contactId,
                    r.callBriefId,
                    r.startedAt,
                    r.completedAt,
                    r.outcome,
                    r.summary,
                    r.customerInterest == null ? CustomerInterest.UNKNOWN : r.customerInterest,
                    r.followUpRequired,
                    r.followUpDate,
                    r.notes)));
  }

  @GetMapping("/businesses/{id}/call-activities")
  List<Response> list(@PathVariable UUID id) {
    return service.list(id).stream().map(this::map).toList();
  }

  @GetMapping("/call-activities/{id}")
  Response get(@PathVariable UUID id) {
    return map(service.get(id));
  }

  @GetMapping("/call-activities")
  List<Response> recent() {
    return service.recent().stream().map(this::map).toList();
  }

  private Response map(CallActivity a) {
    return new Response(
        a.getId(),
        a.getBusiness().getId(),
        a.getBusiness().getName(),
        a.getContact().getId(),
        a.getContact().fullName(),
        a.getCallBrief() == null ? null : a.getCallBrief().getId(),
        a.getStartedAt(),
        a.getCompletedAt(),
        a.getOutcome().name(),
        a.getSummary(),
        a.getCustomerInterest().name(),
        a.isFollowUpRequired(),
        a.getFollowUpDate(),
        a.getCreatedAt());
  }
}

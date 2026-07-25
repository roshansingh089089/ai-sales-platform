package com.roslabs.aisales.task.api;

import com.roslabs.aisales.task.application.TaskService;
import com.roslabs.aisales.task.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/tasks")
public class TaskController {
  private final TaskService service;

  public TaskController(TaskService s) {
    service = s;
  }

  public record StatusRequest(@NotNull TaskStatus status) {}

  public record Response(
      UUID id,
      UUID businessId,
      String businessName,
      UUID contactId,
      String contactName,
      UUID callActivityId,
      String originatingOutcome,
      String title,
      String description,
      Instant dueAt,
      String priority,
      String status,
      Instant createdAt,
      long version) {}

  @GetMapping
  List<Response> list(
      @RequestParam(required = false) TaskStatus status,
      @RequestParam(required = false) Instant dueBefore) {
    return service.list(status, dueBefore).stream().map(this::map).toList();
  }

  @PutMapping("/{id}/status")
  Response status(@PathVariable UUID id, @Valid @RequestBody StatusRequest r) {
    return map(service.status(id, r.status));
  }

  private Response map(Task t) {
    return new Response(
        t.getId(),
        t.getBusiness().getId(),
        t.getBusiness().getName(),
        t.getContact() == null ? null : t.getContact().getId(),
        t.getContact() == null ? null : t.getContact().fullName(),
        t.getCallActivity() == null ? null : t.getCallActivity().getId(),
        t.getCallActivity() == null ? null : t.getCallActivity().getOutcome().name(),
        t.getTitle(),
        t.getDescription(),
        t.getDueAt(),
        t.getPriority().name(),
        t.getStatus().name(),
        t.getCreatedAt(),
        t.getVersion());
  }
}

package com.roslabs.aisales.callbrief.api;

import com.roslabs.aisales.callbrief.application.CallBriefService;
import com.roslabs.aisales.callbrief.domain.CallBrief;
import com.roslabs.aisales.callbrief.domain.GeneratedCallBrief;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CallBriefController {
  private final CallBriefService service;

  public CallBriefController(CallBriefService s) {
    service = s;
  }

  public record GenerateRequest(UUID opportunityId) {}

  public record UpdateRequest(
      @NotBlank String objective,
      @NotBlank String introduction,
      @NotBlank String keyTalkingPoints,
      @NotBlank String discoveryQuestions,
      @NotBlank String likelyObjections,
      @NotBlank String suggestedResponses,
      @NotBlank String nextBestAction) {}

  public record Response(
      UUID id,
      UUID businessId,
      UUID contactId,
      UUID opportunityId,
      String objective,
      String introduction,
      String keyTalkingPoints,
      String discoveryQuestions,
      String likelyObjections,
      String suggestedResponses,
      String nextBestAction,
      String status,
      Instant createdAt,
      long version) {}

  @PostMapping("/contacts/{contactId}/call-briefs/generate")
  ResponseEntity<Response> generate(
      @PathVariable UUID contactId, @RequestBody(required = false) GenerateRequest r) {
    return ResponseEntity.status(201)
        .body(map(service.generate(contactId, r == null ? null : r.opportunityId)));
  }

  @GetMapping("/call-briefs/{id}")
  Response get(@PathVariable UUID id) {
    return map(service.get(id));
  }

  @PutMapping("/call-briefs/{id}")
  Response update(@PathVariable UUID id, @Valid @RequestBody UpdateRequest r) {
    return map(
        service.update(
            id,
            new GeneratedCallBrief(
                r.objective,
                r.introduction,
                r.keyTalkingPoints,
                r.discoveryQuestions,
                r.likelyObjections,
                r.suggestedResponses,
                r.nextBestAction)));
  }

  @GetMapping("/businesses/{businessId}/call-briefs")
  java.util.List<Response> list(@PathVariable UUID businessId) {
    return service.listForBusiness(businessId).stream().map(this::map).toList();
  }

  @PostMapping("/call-briefs/{id}/ready")
  Response ready(@PathVariable UUID id) {
    return map(service.ready(id));
  }

  private Response map(CallBrief b) {
    return new Response(
        b.getId(),
        b.getBusiness().getId(),
        b.getContact().getId(),
        b.getOpportunity() == null ? null : b.getOpportunity().getId(),
        b.getObjective(),
        b.getIntroduction(),
        b.getKeyTalkingPoints(),
        b.getDiscoveryQuestions(),
        b.getLikelyObjections(),
        b.getSuggestedResponses(),
        b.getNextBestAction(),
        b.getStatus().name(),
        b.getCreatedAt(),
        b.getVersion());
  }
}

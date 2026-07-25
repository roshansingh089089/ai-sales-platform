package com.roslabs.aisales.opportunity.api;

import com.roslabs.aisales.opportunity.application.OpportunityService;
import com.roslabs.aisales.opportunity.domain.Opportunity;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/businesses/{businessId}/opportunities")
public class OpportunityController {
  private final OpportunityService service;

  public OpportunityController(OpportunityService s) {
    service = s;
  }

  public record Request(
      @NotBlank String title,
      @NotBlank String problemStatement,
      @NotBlank String proposedSolution,
      @DecimalMin("0") @DecimalMax("1") BigDecimal confidenceScore,
      String evidence,
      com.roslabs.aisales.opportunity.domain.OpportunityStatus status) {}

  public record Response(
      UUID id,
      UUID businessId,
      String title,
      String problemStatement,
      String proposedSolution,
      BigDecimal confidenceScore,
      String evidence,
      String status,
      Instant createdAt,
      long version) {}

  @PostMapping
  ResponseEntity<Response> create(@PathVariable UUID businessId, @Valid @RequestBody Request r) {
    return ResponseEntity.status(201)
        .body(
            map(
                service.create(
                    businessId,
                    r.title,
                    r.problemStatement,
                    r.proposedSolution,
                    r.confidenceScore,
                    r.evidence,
                    r.status)));
  }

  @GetMapping
  List<Response> list(@PathVariable UUID businessId) {
    return service.list(businessId).stream().map(this::map).toList();
  }

  private Response map(Opportunity o) {
    return new Response(
        o.getId(),
        o.getBusiness().getId(),
        o.getTitle(),
        o.getProblemStatement(),
        o.getProposedSolution(),
        o.getConfidenceScore(),
        o.getEvidence(),
        o.getStatus().name(),
        o.getCreatedAt(),
        o.getVersion());
  }
}

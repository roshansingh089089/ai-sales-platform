package com.roslabs.aisales.business.api;

import com.roslabs.aisales.business.application.BusinessService;
import com.roslabs.aisales.business.domain.*;
import com.roslabs.aisales.shared.api.ApiSupport.PageResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/businesses")
public class BusinessController {
  private final BusinessService service;

  public BusinessController(BusinessService s) {
    service = s;
  }

  public record Request(
      @NotBlank @Size(max = 200) String name,
      @Size(max = 500) String website,
      @Size(max = 120) String industry,
      @Size(max = 120) String city,
      @Size(max = 120) String state,
      @Size(max = 120) String country,
      @Size(max = 5000) String description,
      BusinessStatus status) {}

  public record Response(
      UUID id,
      String name,
      String website,
      String industry,
      String city,
      String state,
      String country,
      String description,
      String source,
      String status,
      Instant createdAt,
      Instant updatedAt,
      long version) {}

  @PostMapping
  ResponseEntity<Response> create(@Valid @RequestBody Request r) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            map(
                service.create(
                    r.name, r.website, r.industry, r.city, r.state, r.country, r.description)));
  }

  @GetMapping
  PageResponse<Response> list(
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") @Max(100) int size) {
    var p = service.list(page, size);
    return new PageResponse<>(
        p.map(this::map).getContent(),
        p.getNumber(),
        p.getSize(),
        p.getTotalElements(),
        p.getTotalPages());
  }

  @GetMapping("/{id}")
  Response get(@PathVariable UUID id) {
    return map(service.get(id));
  }

  @PutMapping("/{id}")
  Response update(@PathVariable UUID id, @Valid @RequestBody Request r) {
    return map(
        service.update(
            id,
            r.name,
            r.website,
            r.industry,
            r.city,
            r.state,
            r.country,
            r.description,
            r.status == null ? BusinessStatus.NEW : r.status));
  }

  private Response map(Business b) {
    return new Response(
        b.getId(),
        b.getName(),
        b.getWebsite(),
        b.getIndustry(),
        b.getCity(),
        b.getState(),
        b.getCountry(),
        b.getDescription(),
        b.getSource().name(),
        b.getStatus().name(),
        b.getCreatedAt(),
        b.getUpdatedAt(),
        b.getVersion());
  }
}

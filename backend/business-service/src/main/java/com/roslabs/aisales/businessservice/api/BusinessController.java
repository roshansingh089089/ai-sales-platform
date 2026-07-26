package com.roslabs.aisales.businessservice.api;

import com.roslabs.aisales.businessservice.application.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/businesses")
public class BusinessController {
  private final BusinessApplicationService service;
  private final InternalTokenValidator internalTokenValidator;

  public BusinessController(
      BusinessApplicationService service, InternalTokenValidator internalTokenValidator) {
    this.service = service;
    this.internalTokenValidator = internalTokenValidator;
  }

  public record UpsertBusinessRequest(
      @NotBlank String name,
      String website,
      String phoneNumber,
      String email,
      String address,
      String city,
      String state,
      String country,
      String postalCode,
      String category,
      @NotBlank String source,
      @NotBlank String sourceRef,
      String sourceUrl,
      Double rating,
      Integer reviewCount,
      Double latitude,
      Double longitude) {}

  @PostMapping
  Object upsert(
      @RequestHeader(value = "X-Internal-Token", required = false) String internalToken,
      @Valid @RequestBody UpsertBusinessRequest request) {
    internalTokenValidator.requireValid(internalToken);
    return service.upsert(
        new UpsertBusinessCommand(
            request.name(),
            request.website(),
            request.phoneNumber(),
            request.email(),
            request.address(),
            request.city(),
            request.state(),
            request.country(),
            request.postalCode(),
            request.category(),
            request.source(),
            request.sourceRef(),
            request.sourceUrl(),
            request.rating(),
            request.reviewCount(),
            request.latitude(),
            request.longitude()));
  }

  @GetMapping
  Page<?> search(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return service.search(q, page, size);
  }

  @GetMapping("/{id}")
  Object get(@PathVariable UUID id) {
    return service.get(id);
  }
}

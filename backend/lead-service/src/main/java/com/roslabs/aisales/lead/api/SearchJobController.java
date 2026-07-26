package com.roslabs.aisales.lead.api;

import com.roslabs.aisales.lead.application.SearchJobService;
import com.roslabs.aisales.lead.configuration.LeadServiceProperties;
import com.roslabs.aisales.lead.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/lead-searches")
public class SearchJobController {
  private final SearchJobService service;
  private final LeadServiceProperties properties;

  public SearchJobController(SearchJobService service, LeadServiceProperties properties) {
    this.service = service;
    this.properties = properties;
  }

  public record CreateLeadSearchRequest(
      @NotBlank String query, @NotBlank String location, @Min(1) @Max(20) Integer maximumResults) {}

  public record ProgressRequest(@NotNull SearchJobStatus status, String message) {}

  @PostMapping
  ResponseEntity<SearchJob> create(
      @Valid @RequestBody CreateLeadSearchRequest request,
      @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {
    var job =
        service.create(
            request.query(),
            request.location(),
            request.maximumResults() == null ? 20 : request.maximumResults(),
            idempotencyKey);
    return ResponseEntity.accepted().body(job);
  }

  @GetMapping
  Page<SearchJob> list(
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return service.list(page, size);
  }

  @GetMapping("/{id}")
  SearchJob get(@PathVariable UUID id) {
    return service.get(id);
  }

  @GetMapping("/{id}/status")
  SearchJob status(@PathVariable UUID id) {
    return service.get(id);
  }

  @GetMapping("/{id}/results")
  Page<LeadSearchResult> results(
      @PathVariable UUID id,
      @RequestParam(defaultValue = "") String q,
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String city,
      @RequestParam(required = false) Boolean hasPhone,
      @RequestParam(required = false) Boolean hasEmail,
      @RequestParam(required = false) Boolean hasWebsite,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return service.results(id, q, category, city, hasPhone, hasEmail, hasWebsite, page, size);
  }

  @PostMapping("/{id}/status")
  SearchJob updateStatus(
      @PathVariable UUID id,
      @Valid @RequestBody ProgressRequest request,
      @RequestHeader("X-Internal-Token") String token) {
    requireInternalToken(token);
    return service.transition(id, request.status(), request.message());
  }

  @PostMapping(path = "/{id}/imports", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  SearchJobService.ImportSummary importCsv(
      @PathVariable UUID id,
      @RequestHeader("X-Internal-Token") String token,
      @RequestPart("file") MultipartFile file,
      @RequestParam String provider,
      @RequestParam(required = false) String originalFilename,
      @RequestParam(required = false) String checksum,
      @RequestParam(required = false) Integer declaredRecordCount) {
    requireInternalToken(token);
    return service.importCsv(id, provider, originalFilename, checksum, declaredRecordCount, file);
  }

  private void requireInternalToken(String token) {
    if (!properties.automation().internalToken().equals(token)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal token");
    }
  }
}

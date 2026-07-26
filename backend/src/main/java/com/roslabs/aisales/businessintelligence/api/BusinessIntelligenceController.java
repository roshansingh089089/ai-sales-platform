package com.roslabs.aisales.businessintelligence.api;

import com.roslabs.aisales.businessintelligence.application.*;
import com.roslabs.aisales.businessintelligence.domain.*;
import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.WebsiteFilter;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/intelligence")
public class BusinessIntelligenceController {
  private final BusinessIntelligenceDiscoveryService discovery;
  private final BusinessQueryService query;

  public BusinessIntelligenceController(
      BusinessIntelligenceDiscoveryService discovery, BusinessQueryService query) {
    this.discovery = discovery;
    this.query = query;
  }

  public record SearchRequest(
      @NotBlank @Size(max = 120) String category,
      @NotBlank @Size(max = 200) String location,
      @NotNull @Min(100) @Max(50000) Integer radiusMeters,
      @NotNull @Min(1) @Max(100) Integer maximumResults,
      boolean phoneRequired,
      WebsiteFilter websiteFilter) {}

  public record SearchResponse(
      String searchId, int discoveredCount, int persistedCount, int queuedJobs, List<String> businessIds) {}

  public record BusinessResponse(
      String id,
      String businessName,
      List<String> categories,
      String address,
      String phoneNumber,
      String website,
      Double latitude,
      Double longitude,
      Integer distanceMeters,
      int leadScore,
      String qualification,
      List<String> qualificationReasons,
      BusinessIntelligenceStatus status,
      List<BusinessSourceRef> sources,
      Instant createdAt,
      Instant updatedAt) {}

  public record StatusResponse(
      String businessId,
      BusinessIntelligenceStatus status,
      int completedSteps,
      int totalSteps,
      List<StepProgress> steps,
      String lastError,
      Instant updatedAt) {}

  public record SearchHistoryResponse(
      String id,
      String category,
      String location,
      int radiusMeters,
      int maximumResults,
      int discoveredCount,
      int persistedCount,
      List<String> businessIds,
      Instant createdAt) {}

  @PostMapping("/businesses/search")
  ResponseEntity<SearchResponse> search(@Valid @RequestBody SearchRequest request) {
    var result =
        discovery.discover(
            new BusinessDiscoveryRequest(
                request.category(),
                request.location(),
                request.radiusMeters(),
                request.maximumResults(),
                request.phoneRequired(),
                request.websiteFilter() == null ? WebsiteFilter.ANY : request.websiteFilter()));
    return ResponseEntity.accepted()
        .body(
            new SearchResponse(
                result.searchId(),
                result.discoveredCount(),
                result.persistedCount(),
                result.queuedJobs(),
                result.businessIds()));
  }

  @GetMapping("/businesses")
  Page<BusinessResponse> businesses(
      @RequestParam(defaultValue = "") String q,
      @RequestParam(defaultValue = "0") @Min(0) int page,
      @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
    return query.search(q, page, size).map(this::map);
  }

  @GetMapping("/businesses/{id}")
  BusinessResponse business(@PathVariable String id) {
    return map(query.get(id));
  }

  @GetMapping("/businesses/{id}/status")
  StatusResponse status(@PathVariable String id) {
    return map(query.status(id));
  }

  @GetMapping("/search-history")
  List<SearchHistoryResponse> history() {
    return query.recentSearches().stream().map(this::map).toList();
  }

  private BusinessResponse map(CanonicalBusiness business) {
    return new BusinessResponse(
        business.getId(),
        business.getBusinessName(),
        business.getCategories(),
        business.getAddress(),
        business.getPhoneNumber(),
        business.getWebsite(),
        business.getLatitude(),
        business.getLongitude(),
        business.getDistanceMeters(),
        business.getLeadScore(),
        business.getQualification(),
        business.getQualificationReasons(),
        business.getStatus(),
        business.getSources(),
        business.getCreatedAt(),
        business.getUpdatedAt());
  }

  private StatusResponse map(EnrichmentStatus status) {
    return new StatusResponse(
        status.getBusinessId(),
        status.getStatus(),
        status.getCompletedSteps(),
        status.getTotalSteps(),
        status.getSteps(),
        status.getLastError(),
        status.getUpdatedAt());
  }

  private SearchHistoryResponse map(SearchHistory history) {
    return new SearchHistoryResponse(
        history.getId(),
        history.getCategory(),
        history.getLocation(),
        history.getRadiusMeters(),
        history.getMaximumResults(),
        history.getDiscoveredCount(),
        history.getPersistedCount(),
        history.getBusinessIds(),
        history.getCreatedAt());
  }
}

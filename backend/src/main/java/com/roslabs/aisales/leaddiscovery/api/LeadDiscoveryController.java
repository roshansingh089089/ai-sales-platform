package com.roslabs.aisales.leaddiscovery.api;

import com.roslabs.aisales.leaddiscovery.application.LeadDiscoveryService;
import com.roslabs.aisales.leaddiscovery.application.Qualification;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/lead-discovery")
public class LeadDiscoveryController {
  private final LeadDiscoveryService service;

  public LeadDiscoveryController(LeadDiscoveryService service) {
    this.service = service;
  }

  public enum WebsiteFilter {
    ANY,
    HAS_WEBSITE,
    NO_WEBSITE
  }

  public record SearchRequest(
      @NotBlank @Size(max = 120) String category,
      @NotBlank @Size(max = 200) String location,
      @NotNull @Min(100) @Max(50000) Integer radiusMeters,
      @Min(1) @Max(100) Integer maximumResults,
      boolean phoneRequired,
      WebsiteFilter websiteFilter) {}

  public record LeadResponse(
      String source,
      String sourcePlaceId,
      String businessName,
      List<String> categories,
      String address,
      String phoneNumber,
      String website,
      Double latitude,
      Double longitude,
      Integer distanceMeters,
      int leadScore,
      Qualification qualification,
      List<String> qualificationReasons) {}

  @PostMapping("/search")
  ResponseEntity<List<LeadResponse>> search(@Valid @RequestBody SearchRequest request) {
    return ResponseEntity.ok(service.search(request));
  }
}

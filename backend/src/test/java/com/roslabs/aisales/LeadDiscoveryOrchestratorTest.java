package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.*;

import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.SearchRequest;
import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController.WebsiteFilter;
import com.roslabs.aisales.leaddiscovery.application.*;
import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.Test;

class LeadDiscoveryOrchestratorTest {
  @Test
  void expandsCategoryMergesDuplicatesEnrichesThenScoresAndRanks() {
    var geoapify =
        new StubProvider(
            "GEOAPIFY",
            true,
            List.of(
                new LeadCandidate(
                    "GEOAPIFY",
                    "geo-1",
                    "Smile Dental Clinic",
                    List.of("healthcare.dentist"),
                    "27th Main Road",
                    "080-1234-5678",
                    null,
                    12.912,
                    77.641,
                    650)));
    var openStreetMap =
        new StubProvider(
            "OPEN_STREET_MAP",
            false,
            List.of(
                new LeadCandidate(
                    "OPEN_STREET_MAP",
                    "osm-1",
                    "Smile Dental",
                    List.of("dental clinic"),
                    null,
                    "08012345678",
                    "https://smile.example",
                    12.9122,
                    77.6412,
                    620),
                new LeadCandidate(
                    "OPEN_STREET_MAP",
                    "osm-2",
                    "Faraway Oral Care",
                    List.of("oral surgeon"),
                    "Indiranagar",
                    null,
                    null,
                    12.973,
                    77.64,
                    6100)));

    var orchestrator = orchestrator(List.of(geoapify, openStreetMap));

    var leads =
        orchestrator.discover(
            new SearchRequest("DENTIST", "HSR Layout, Bengaluru", 5000, 20, false, WebsiteFilter.ANY));

    assertThat(geoapify.queries()).containsExactly("healthcare.dentist");
    assertThat(openStreetMap.queries()).isEmpty();
    assertThat(leads).hasSize(1);

    var enrichedDuplicate = leads.getFirst();
    assertThat(enrichedDuplicate.source()).isEqualTo("GEOAPIFY");
    assertThat(enrichedDuplicate.sourcePlaceId()).isEqualTo("geo-1");
    assertThat(enrichedDuplicate.businessName()).isEqualTo("Smile Dental Clinic");
    assertThat(enrichedDuplicate.categories())
        .containsExactly("healthcare.dentist");
    assertThat(enrichedDuplicate.address()).isEqualTo("27th Main Road");
    assertThat(enrichedDuplicate.phoneNumber()).isEqualTo("080-1234-5678");
    assertThat(enrichedDuplicate.website()).isNull();
    assertThat(enrichedDuplicate.leadScore()).isEqualTo(100);
    assertThat(enrichedDuplicate.qualification()).isEqualTo(Qualification.HIGH);
  }

  @Test
  void sendsRequestedMaximumResultsWhenWithinConfiguredLimitAndAppliesFiltersBeforeDeduplication() {
    var provider =
        new StubProvider(
            "OPEN_STREET_MAP",
            false,
            List.of(
                new LeadCandidate(
                    "OPEN_STREET_MAP",
                    "osm-1",
                    "No Phone Restaurant",
                    List.of("restaurant"),
                    "HSR Layout",
                    null,
                    null,
                    12.91,
                    77.64,
                    500),
                new LeadCandidate(
                    "OPEN_STREET_MAP",
                    "osm-2",
                    "Callable Restaurant",
                    List.of("restaurant"),
                    "HSR Layout",
                    "9999999999",
                    null,
                    12.92,
                    77.65,
                    800)));

    var orchestrator = orchestrator(List.of(provider));

    var leads =
        orchestrator.discover(
            new SearchRequest(
                "restaurant", "HSR Layout, Bengaluru", 10000, 100, true, WebsiteFilter.NO_WEBSITE));

    assertThat(leads).hasSize(1);
    assertThat(leads.getFirst().businessName()).isEqualTo("Callable Restaurant");
    assertThat(provider.maximumResults()).containsExactly(100);
  }

  private LeadDiscoveryOrchestrator orchestrator(List<LeadDiscoveryProvider> providers) {
    return new LeadDiscoveryOrchestrator(
        providers,
        new CategoryExpansionService(),
        new LeadScoringService(),
        new LeadDiscoveryProperties("", 100, Duration.ofSeconds(5), Duration.ofSeconds(5), true, 20));
  }

  private static class StubProvider implements LeadDiscoveryProvider {
    private final String source;
    private final boolean supportsDotCategories;
    private final List<LeadCandidate> results;
    private final List<String> queries = new ArrayList<>();
    private final List<Integer> maximumResults = new ArrayList<>();

    StubProvider(String source, boolean supportsDotCategories, List<LeadCandidate> results) {
      this.source = source;
      this.supportsDotCategories = supportsDotCategories;
      this.results = results;
    }

    @Override
    public String source() {
      return source;
    }

    @Override
    public boolean supports(String providerCategory) {
      return supportsDotCategories == providerCategory.contains(".");
    }

    @Override
    public List<LeadCandidate> search(
        String category, String location, int radiusMeters, int maximumResults) {
      queries.add(category);
      this.maximumResults.add(maximumResults);
      return results;
    }

    List<String> queries() {
      return queries;
    }

    List<Integer> maximumResults() {
      return maximumResults;
    }
  }
}

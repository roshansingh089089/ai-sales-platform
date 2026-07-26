package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.assertThat;

import com.roslabs.aisales.businessintelligence.application.*;
import com.roslabs.aisales.businessintelligence.configuration.BusinessIntelligenceProperties;
import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class BusinessIntelligenceFoundationTest {
  @Test
  void canonicalBusinessMergesOnlyMissingDiscoveryFieldsAndTracksSources() {
    var business = new CanonicalBusiness();

    business.mergeDiscovery(
        "GEOAPIFY",
        "place-1",
        "Smile Studio",
        List.of("healthcare.dentist"),
        "HSR Layout",
        null,
        null,
        12.91,
        77.64,
        500,
        70,
        "MEDIUM",
        List.of("Matches requested category"));
    business.mergeDiscovery(
        "GOOGLE_PLACES",
        "google-1",
        "Smile Studio",
        List.of("dentist"),
        "HSR Layout",
        "08012345678",
        "https://smile.example",
        12.91,
        77.64,
        450,
        90,
        "HIGH",
        List.of("Phone available"));

    assertThat(business.getBusinessName()).isEqualTo("Smile Studio");
    assertThat(business.getPhoneNumber()).isEqualTo("08012345678");
    assertThat(business.getWebsite()).isEqualTo("https://smile.example");
    assertThat(business.getCategories()).containsExactly("healthcare.dentist", "dentist");
    assertThat(business.getLeadScore()).isEqualTo(90);
    assertThat(business.getSources()).hasSize(2);
  }

  @Test
  void searchResultCacheExpiresEntries() throws Exception {
    var cache =
        new SearchResultCache(
            new BusinessIntelligenceProperties(
                true, true, Duration.ofMillis(1), 10, 10, 3, Duration.ofSeconds(30)));
    var result = new BusinessDiscoveryResult("search-1", 2, 2, 2, List.of("a", "b"));

    cache.put("key", result);

    assertThat(cache.get("key")).contains(result);
    Thread.sleep(5);
    assertThat(cache.get("key")).isEmpty();
  }
}

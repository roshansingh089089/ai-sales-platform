package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.assertThat;

import com.roslabs.aisales.leaddiscovery.application.*;
import java.util.List;
import org.junit.jupiter.api.Test;

class LeadScoringServiceTest {
  private final LeadScoringService scoring = new LeadScoringService();

  @Test
  void scoresHighLeadFromCategoryPhoneMissingWebsiteDistanceAndValidData() {
    var candidate =
        new LeadCandidate(
            "GEOAPIFY",
            "abc",
            "Smile Studio",
            List.of("healthcare.dentist"),
            "HSR Layout, Bengaluru",
            "08012345678",
            null,
            12.91,
            77.64,
            900);

    var score = scoring.score(candidate, "dentist");

    assertThat(score.score()).isEqualTo(100);
    assertThat(score.qualification()).isEqualTo(Qualification.HIGH);
    assertThat(score.reasons())
        .containsExactly(
            "Matches requested category",
            "Phone available",
            "No website",
            "Within 2 km of requested location",
            "Valid business data");
  }

  @Test
  void scoresMediumAndLowWithoutRatingsOrReviews() {
    var medium =
        new LeadCandidate(
            "GEOAPIFY",
            "medium",
            "Nearby Clinic",
            List.of("healthcare.clinic"),
            "Bengaluru",
            "08012345678",
            "https://clinic.example",
            12.91,
            77.64,
            3000);
    var low =
        new LeadCandidate(
            "GEOAPIFY",
            null,
            null,
            List.of("commercial"),
            null,
            null,
            "https://shop.example",
            null,
            null,
            12000);

    assertThat(scoring.score(medium, "clinic").qualification()).isEqualTo(Qualification.MEDIUM);
    assertThat(scoring.score(low, "clinic").qualification()).isEqualTo(Qualification.LOW);
  }
}

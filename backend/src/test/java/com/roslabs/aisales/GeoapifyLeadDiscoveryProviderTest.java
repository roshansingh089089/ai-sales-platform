package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.*;

import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import com.roslabs.aisales.leaddiscovery.infrastructure.*;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class GeoapifyLeadDiscoveryProviderTest {
  @Test
  void geocodesLocationAndMapsPlacesIntoProviderNeutralCandidates() {
    var provider =
        new GeoapifyProvider(
            new FakeGeoapifyClient(
                List.of(new GeoapifyGeocodingResponse.Result(12.91, 77.64, "HSR Layout")),
                List.of(
                    new GeoapifyPlacesResponse.Feature(
                        new GeoapifyPlacesResponse.Properties(
                            null,
                            "place-1",
                            "Smile Studio",
                            List.of("healthcare.dentist"),
                            "27th Main Road",
                            null,
                            null,
                            new GeoapifyPlacesResponse.Contact(
                                "08012345678", "https://smile.example"),
                            700),
                        new GeoapifyPlacesResponse.Geometry(List.of(77.641, 12.912))))),
            properties());

    var results = provider.search("healthcare.dentist", "HSR Layout", 5000, 10);

    assertThat(results).hasSize(1);
    assertThat(results.getFirst().source()).isEqualTo("GEOAPIFY");
    assertThat(results.getFirst().sourcePlaceId()).isEqualTo("place-1");
    assertThat(results.getFirst().businessName()).isEqualTo("Smile Studio");
    assertThat(results.getFirst().categories()).containsExactly("healthcare.dentist");
    assertThat(results.getFirst().address()).isEqualTo("27th Main Road");
    assertThat(results.getFirst().phoneNumber()).isEqualTo("08012345678");
    assertThat(results.getFirst().website()).isEqualTo("https://smile.example");
    assertThat(results.getFirst().latitude()).isEqualTo(12.912);
    assertThat(results.getFirst().longitude()).isEqualTo(77.641);
    assertThat(results.getFirst().distanceMeters()).isEqualTo(700);
  }

  @Test
  void rejectsUnresolvedLocations() {
    var provider = new GeoapifyProvider(new FakeGeoapifyClient(List.of(), List.of()), properties());

    assertThatThrownBy(() -> provider.search("dentist", "Nowhere", 1000, 5))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessage("Location could not be resolved");
  }

  @Test
  void enrichesMissingContactDataFromPlaceDetailsBeforeReturningCandidates() {
    var provider =
        new GeoapifyProvider(
            new FakeGeoapifyClient(
                List.of(new GeoapifyGeocodingResponse.Result(12.91, 77.64, "HSR Layout")),
                List.of(
                    new GeoapifyPlacesResponse.Feature(
                        new GeoapifyPlacesResponse.Properties(
                            null,
                            "place-1",
                            "Smile Studio",
                            List.of("healthcare.dentist"),
                            "27th Main Road",
                            null,
                            null,
                            null,
                            700),
                        new GeoapifyPlacesResponse.Geometry(List.of(77.641, 12.912)))),
                List.of(
                    new GeoapifyPlacesResponse.Feature(
                        new GeoapifyPlacesResponse.Properties(
                            "details",
                            "place-1",
                            "Smile Studio",
                            List.of("healthcare.dentist"),
                            "27th Main Road",
                            null,
                            null,
                            new GeoapifyPlacesResponse.Contact(
                                "08012345678", "https://smile.example"),
                            700),
                        new GeoapifyPlacesResponse.Geometry(List.of(77.641, 12.912))))),
            properties());

    var results = provider.search("healthcare.dentist", "HSR Layout", 5000, 10);

    assertThat(results).hasSize(1);
    assertThat(results.getFirst().phoneNumber()).isEqualTo("08012345678");
    assertThat(results.getFirst().website()).isEqualTo("https://smile.example");
  }

  private LeadDiscoveryProperties properties() {
    return new LeadDiscoveryProperties(
        "", 100, Duration.ofSeconds(5), Duration.ofSeconds(5), true, 20);
  }

  private record FakeGeoapifyClient(
      List<GeoapifyGeocodingResponse.Result> geocodingResults,
      List<GeoapifyPlacesResponse.Feature> placeResults,
      List<GeoapifyPlacesResponse.Feature> placeDetailsResults)
      implements GeoapifyClient {
    FakeGeoapifyClient(
        List<GeoapifyGeocodingResponse.Result> geocodingResults,
        List<GeoapifyPlacesResponse.Feature> placeResults) {
      this(geocodingResults, placeResults, List.of());
    }

    @Override
    public List<GeoapifyGeocodingResponse.Result> geocode(String location) {
      return geocodingResults;
    }

    @Override
    public List<GeoapifyPlacesResponse.Feature> places(
        String category, double latitude, double longitude, int radiusMeters, int maximumResults) {
      return placeResults;
    }

    @Override
    public List<GeoapifyPlacesResponse.Feature> placeDetails(String placeId) {
      return placeDetailsResults;
    }
  }
}

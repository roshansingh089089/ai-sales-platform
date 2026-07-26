package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roslabs.aisales.leaddiscovery.infrastructure.GeoapifyGeocodingResponse;
import org.junit.jupiter.api.Test;

class GeoapifyGeocodingResponseTest {
  private final ObjectMapper objectMapper = new ObjectMapper();

  @Test
  void mapsGeoapifyJsonFormatResultsForBengaluruLocations() throws Exception {
    var response =
        objectMapper.readValue(
            """
            {
              "results": [
                {
                  "formatted": "HSR Layout, Bengaluru, Karnataka, India",
                  "lat": 12.9116,
                  "lon": 77.6389
                },
                {
                  "formatted": "Koramangala, Bengaluru, Karnataka, India",
                  "lat": 12.9352,
                  "lon": 77.6245
                },
                {
                  "formatted": "Indiranagar, Bengaluru, Karnataka, India",
                  "lat": 12.9784,
                  "lon": 77.6408
                }
              ]
            }
            """,
            GeoapifyGeocodingResponse.class);

    assertThat(response.results()).hasSize(3);
    assertThat(response.results().get(0).formatted()).contains("HSR Layout");
    assertThat(response.results().get(0).lat()).isEqualTo(12.9116);
    assertThat(response.results().get(0).lon()).isEqualTo(77.6389);
    assertThat(response.results().get(1).formatted()).contains("Koramangala");
    assertThat(response.results().get(2).formatted()).contains("Indiranagar");
  }
}

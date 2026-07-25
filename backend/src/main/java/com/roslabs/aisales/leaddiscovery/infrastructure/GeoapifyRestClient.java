package com.roslabs.aisales.leaddiscovery.infrastructure;

import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.List;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;

@Component
public class GeoapifyRestClient implements GeoapifyClient {
  private static final Logger log = LoggerFactory.getLogger(GeoapifyRestClient.class);

  private final RestClient client;
  private final LeadDiscoveryProperties properties;

  public GeoapifyRestClient(
      @Qualifier("geoapifyHttpClient") RestClient client, LeadDiscoveryProperties properties) {
    this.client = client;
    this.properties = properties;
  }

  @Override
  public List<GeoapifyGeocodingResponse.Result> geocode(String location) {
    validateApiKey();
    try {
      var response =
          client
              .get()
              .uri(
                  builder ->
                      builder
                          .path("/v1/geocode/search")
                          .queryParam("text", location)
                          .queryParam("limit", 1)
                          .queryParam("apiKey", properties.geoapifyApiKey())
                          .build())
              .retrieve()
              .onStatus(HttpStatusCode::isError, this::throwProviderError)
              .body(GeoapifyGeocodingResponse.class);
      return response == null || response.results() == null ? List.of() : response.results();
    } catch (ResourceAccessException e) {
      throwIfTimeout(e, "Geoapify Geocoding API timed out");
      throw e;
    }
  }

  @Override
  public List<GeoapifyPlacesResponse.Feature> places(
      String category, double latitude, double longitude, int radiusMeters, int maximumResults) {
    validateApiKey();
    try {
      var response =
          client
              .get()
              .uri(
                  builder ->
                      builder
                          .path("/v2/places")
                          .queryParam("categories", category)
                          .queryParam(
                              "filter", "circle:" + longitude + "," + latitude + "," + radiusMeters)
                          .queryParam("bias", "proximity:" + longitude + "," + latitude)
                          .queryParam("limit", maximumResults)
                          .queryParam("apiKey", properties.geoapifyApiKey())
                          .build())
              .retrieve()
              .onStatus(HttpStatusCode::isError, this::throwProviderError)
              .body(GeoapifyPlacesResponse.class);
      return response == null || response.features() == null ? List.of() : response.features();
    } catch (ResourceAccessException e) {
      throwIfTimeout(e, "Geoapify Places API timed out");
      throw e;
    }
  }

  private void validateApiKey() {
    if (properties.geoapifyApiKey() == null || properties.geoapifyApiKey().isBlank()) {
      throw new IllegalStateException("GEOAPIFY_API_KEY is not configured");
    }
  }

  private void throwProviderError(
      org.springframework.http.HttpRequest request,
      org.springframework.http.client.ClientHttpResponse response)
      throws IOException {
    throw new LeadDiscoveryProviderException(
        response.getStatusCode(), "Geoapify API request failed");
  }

  private void throwIfTimeout(ResourceAccessException e, String message) {
    if (isTimeout(e)) {
      log.warn("geoapify_timeout message=\"{}\"", message);
      throw new LeadDiscoveryTimeoutException(message);
    }
  }

  private boolean isTimeout(Throwable error) {
    Throwable current = error;
    while (current != null) {
      if (current instanceof SocketTimeoutException) return true;
      current = current.getCause();
    }
    return false;
  }
}

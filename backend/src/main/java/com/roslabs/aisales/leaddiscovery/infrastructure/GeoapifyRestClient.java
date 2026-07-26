package com.roslabs.aisales.leaddiscovery.infrastructure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import java.io.IOException;
import java.net.SocketTimeoutException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.*;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class GeoapifyRestClient implements GeoapifyClient {
  private static final Logger log = LoggerFactory.getLogger(GeoapifyRestClient.class);
  private static final String BASE_URL = "https://api.geoapify.com";

  private final RestClient client;
  private final LeadDiscoveryProperties properties;
  private final ObjectMapper objectMapper;

  public GeoapifyRestClient(
      @Qualifier("geoapifyHttpClient") RestClient client,
      LeadDiscoveryProperties properties,
      ObjectMapper objectMapper) {
    this.client = client;
    this.properties = properties;
    this.objectMapper = objectMapper;
  }

  @Override
  public List<GeoapifyGeocodingResponse.Result> geocode(String location) {
    validateApiKey();
    try {
      URI uri = geocodingUri(location);
      log.info("geoapify_geocoding_request url=\"{}\"", sanitize(uri));
      var parsed = exchange(uri, GeoapifyGeocodingResponse.class, "geocoding");
      return parsed == null || parsed.results() == null ? List.of() : parsed.results();
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
      URI uri = placesUri(category, latitude, longitude, radiusMeters, maximumResults);
      log.info(
          "geoapify_places_request categories=\"{}\" filter=\"{}\" bias=\"{}\" limit={} conditions=\"{}\" url=\"{}\"",
          category,
          "circle:" + longitude + "," + latitude + "," + radiusMeters,
          "proximity:" + longitude + "," + latitude,
          maximumResults,
          "none",
          sanitize(uri));
      var response = exchange(uri, GeoapifyPlacesResponse.class, "places");
      var features = response == null || response.features() == null ? List.<GeoapifyPlacesResponse.Feature>of() : response.features();
      log.info("lead_discovery_stage provider=GEOAPIFY stage=raw_geoapify_features count={}", features.size());
      return features;
    } catch (ResourceAccessException e) {
      throwIfTimeout(e, "Geoapify Places API timed out");
      throw e;
    }
  }

  @Override
  public List<GeoapifyPlacesResponse.Feature> placeDetails(String placeId) {
    validateApiKey();
    try {
      URI uri = placeDetailsUri(placeId);
      log.info("geoapify_place_details_request placeId=\"{}\" url=\"{}\"", placeId, sanitize(uri));
      var response = exchange(uri, GeoapifyPlacesResponse.class, "place_details");
      var features =
          response == null || response.features() == null
              ? List.<GeoapifyPlacesResponse.Feature>of()
              : response.features();
      log.info(
          "lead_discovery_stage provider=GEOAPIFY stage=raw_geoapify_place_details_features placeId=\"{}\" count={}",
          placeId,
          features.size());
      return features;
    } catch (ResourceAccessException e) {
      throwIfTimeout(e, "Geoapify Place Details API timed out");
      throw e;
    }
  }

  private URI geocodingUri(String location) {
    return UriComponentsBuilder.fromUriString(BASE_URL)
        .path("/v1/geocode/search")
        .queryParam("text", location)
        .queryParam("format", "json")
        .queryParam("limit", 1)
        .queryParam("apiKey", properties.geoapifyApiKey())
        .build()
        .toUri();
  }

  private URI placesUri(
      String category, double latitude, double longitude, int radiusMeters, int maximumResults) {
    return UriComponentsBuilder.fromUriString(BASE_URL)
        .path("/v2/places")
        .queryParam("categories", category)
        .queryParam("filter", "circle:" + longitude + "," + latitude + "," + radiusMeters)
        .queryParam("bias", "proximity:" + longitude + "," + latitude)
        .queryParam("limit", maximumResults)
        .queryParam("apiKey", properties.geoapifyApiKey())
        .build()
        .toUri();
  }

  private URI placeDetailsUri(String placeId) {
    return UriComponentsBuilder.fromUriString(BASE_URL)
        .path("/v2/place-details")
        .queryParam("id", placeId)
        .queryParam("features", "details")
        .queryParam("apiKey", properties.geoapifyApiKey())
        .build()
        .toUri();
  }

  private <T> T exchange(URI uri, Class<T> responseType, String operation) {
    return client
        .get()
        .uri(uri)
        .exchange(
            (request, apiResponse) -> {
              var body = new String(apiResponse.getBody().readAllBytes(), StandardCharsets.UTF_8);
              log.info(
                  "geoapify_{}_response status={} body=\"{}\"",
                  operation,
                  apiResponse.getStatusCode().value(),
                  abbreviate(body));
              if (apiResponse.getStatusCode().isError()) {
                throw new LeadDiscoveryProviderException(
                    apiResponse.getStatusCode(), "Geoapify " + operation + " API request failed");
              }
              try {
                return objectMapper.readValue(body, responseType);
              } catch (IOException e) {
                throw new LeadDiscoveryProviderException(
                    HttpStatus.BAD_GATEWAY,
                    "Geoapify " + operation + " API response could not be parsed");
              }
            });
  }

  private void validateApiKey() {
    if (properties.geoapifyApiKey() == null || properties.geoapifyApiKey().isBlank()) {
      throw new IllegalStateException("GEOAPIFY_API_KEY is not configured");
    }
  }

  private String sanitize(URI uri) {
    return uri.toString().replaceAll("apiKey=[^&]+", "apiKey=REDACTED");
  }

  private String abbreviate(String body) {
    if (body == null) return "";
    var compact = body.replaceAll("\\s+", " ").trim();
    return compact.length() <= 1000 ? compact : compact.substring(0, 1000) + "...";
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

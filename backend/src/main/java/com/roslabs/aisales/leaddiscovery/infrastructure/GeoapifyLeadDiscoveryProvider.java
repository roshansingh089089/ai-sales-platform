package com.roslabs.aisales.leaddiscovery.infrastructure;

import com.roslabs.aisales.leaddiscovery.application.*;
import java.util.List;
import org.slf4j.*;
import org.springframework.stereotype.Component;

@Component
public class GeoapifyLeadDiscoveryProvider implements LeadDiscoveryProvider {
  private static final Logger log = LoggerFactory.getLogger(GeoapifyLeadDiscoveryProvider.class);
  private static final String SOURCE = "GEOAPIFY";

  private final GeoapifyClient client;

  public GeoapifyLeadDiscoveryProvider(GeoapifyClient client) {
    this.client = client;
  }

  @Override
  public String source() {
    return SOURCE;
  }

  @Override
  public List<LeadCandidate> search(
      String category, String location, int radiusMeters, int maximumResults) {
    var geocoded =
        client.geocode(location).stream()
            .filter(result -> result.lat() != null && result.lon() != null)
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Location could not be resolved"));

    log.info(
        "lead_discovery_location_resolved provider={} location=\"{}\" latitude={} longitude={}",
        SOURCE,
        location,
        geocoded.lat(),
        geocoded.lon());

    return client
        .places(category, geocoded.lat(), geocoded.lon(), radiusMeters, maximumResults)
        .stream()
        .map(feature -> map(feature, category))
        .toList();
  }

  private LeadCandidate map(GeoapifyPlacesResponse.Feature feature, String category) {
    var properties = feature.properties();
    var geometry = feature.geometry();
    var coordinates = geometry == null ? null : geometry.coordinates();
    Double longitude = coordinates == null || coordinates.size() < 1 ? null : coordinates.get(0);
    Double latitude = coordinates == null || coordinates.size() < 2 ? null : coordinates.get(1);
    var categories = properties == null ? List.of(category) : nonNull(properties.categories());
    return new LeadCandidate(
        SOURCE,
        properties == null ? null : properties.placeId(),
        properties == null ? null : properties.name(),
        categories,
        properties == null ? null : properties.formatted(),
        phone(properties),
        website(properties),
        latitude,
        longitude,
        properties == null ? null : properties.distance());
  }

  private String phone(GeoapifyPlacesResponse.Properties properties) {
    if (properties == null) return null;
    if (properties.contact() != null && properties.contact().phone() != null) {
      return properties.contact().phone();
    }
    return properties.phone();
  }

  private String website(GeoapifyPlacesResponse.Properties properties) {
    if (properties == null) return null;
    if (properties.contact() != null && properties.contact().website() != null) {
      return properties.contact().website();
    }
    return properties.website();
  }

  private List<String> nonNull(List<String> values) {
    return values == null ? List.of() : values;
  }
}

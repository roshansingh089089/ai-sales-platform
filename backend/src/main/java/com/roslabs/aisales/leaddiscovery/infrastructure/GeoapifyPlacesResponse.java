package com.roslabs.aisales.leaddiscovery.infrastructure;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public record GeoapifyPlacesResponse(List<Feature> features) {
  public record Feature(Properties properties, Geometry geometry) {}

  public record Geometry(List<Double> coordinates) {}

  public record Properties(
      @JsonProperty("feature_type") String featureType,
      @JsonProperty("place_id") String placeId,
      String name,
      List<String> categories,
      String formatted,
      String phone,
      String website,
      Contact contact,
      Integer distance) {}

  public record Contact(String phone, String website) {}
}

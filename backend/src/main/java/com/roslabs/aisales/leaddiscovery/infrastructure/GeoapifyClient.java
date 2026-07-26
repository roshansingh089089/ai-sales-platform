package com.roslabs.aisales.leaddiscovery.infrastructure;

import java.util.List;

public interface GeoapifyClient {
  List<GeoapifyGeocodingResponse.Result> geocode(String location);

  List<GeoapifyPlacesResponse.Feature> places(
      String category, double latitude, double longitude, int radiusMeters, int maximumResults);

  List<GeoapifyPlacesResponse.Feature> placeDetails(String placeId);
}

package com.roslabs.aisales.leaddiscovery.infrastructure;

import java.util.List;

public record GeoapifyGeocodingResponse(List<Result> results) {
  public record Result(Double lat, Double lon, String formatted) {}
}

package com.roslabs.aisales.lead.application;

import java.util.UUID;

public interface BusinessServiceClient {
  UUID upsert(DiscoveredBusiness business);

  record DiscoveredBusiness(
      String name,
      String website,
      String phoneNumber,
      String email,
      String address,
      String city,
      String state,
      String country,
      String postalCode,
      String category,
      String source,
      String sourceRef,
      String sourceUrl,
      Double rating,
      Integer reviewCount,
      Double latitude,
      Double longitude) {}
}

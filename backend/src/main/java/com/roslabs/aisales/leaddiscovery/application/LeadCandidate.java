package com.roslabs.aisales.leaddiscovery.application;

import java.util.List;

public record LeadCandidate(
    String source,
    String sourcePlaceId,
    String businessName,
    List<String> categories,
    String address,
    String phoneNumber,
    String website,
    Double latitude,
    Double longitude,
    Integer distanceMeters) {}

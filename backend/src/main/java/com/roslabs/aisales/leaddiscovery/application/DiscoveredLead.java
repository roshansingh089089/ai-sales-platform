package com.roslabs.aisales.leaddiscovery.application;

import java.util.List;

public record DiscoveredLead(
    String source,
    String sourcePlaceId,
    String businessName,
    List<String> categories,
    String address,
    String phoneNumber,
    String website,
    Double latitude,
    Double longitude,
    Integer distanceMeters,
    int leadScore,
    Qualification qualification,
    List<String> qualificationReasons) {}

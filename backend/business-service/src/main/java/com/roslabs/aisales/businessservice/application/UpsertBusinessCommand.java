package com.roslabs.aisales.businessservice.application;

public record UpsertBusinessCommand(
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

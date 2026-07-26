package com.roslabs.aisales.leaddiscovery.application;

import java.util.List;

public interface LeadDiscoveryProvider {
  String source();

  boolean supports(String providerCategory);

  List<LeadCandidate> search(
      String category, String location, int radiusMeters, int maximumResults);
}

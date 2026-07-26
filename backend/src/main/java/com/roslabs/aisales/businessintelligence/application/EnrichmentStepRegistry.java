package com.roslabs.aisales.businessintelligence.application;

import java.util.List;

public final class EnrichmentStepRegistry {
  private EnrichmentStepRegistry() {}

  public static List<String> names() {
    return List.of(
        "WebsiteDiscoveryStep",
        "WebsiteCrawlerStep",
        "ContactExtractionStep",
        "SocialDiscoveryStep",
        "AIQualificationStep");
  }
}

package com.roslabs.aisales.leaddiscovery.infrastructure;

import com.roslabs.aisales.leaddiscovery.application.*;
import java.util.List;
import org.slf4j.*;
import org.springframework.stereotype.Component;

@Component
public class OpenStreetMapProvider implements LeadDiscoveryProvider {
  private static final Logger log = LoggerFactory.getLogger(OpenStreetMapProvider.class);
  private static final String SOURCE = "OPEN_STREET_MAP";

  @Override
  public String source() {
    return SOURCE;
  }

  @Override
  public boolean supports(String providerCategory) {
    return providerCategory != null && !providerCategory.contains(".");
  }

  @Override
  public List<LeadCandidate> search(
      String category, String location, int radiusMeters, int maximumResults) {
    log.info(
        "lead_discovery_provider_partial provider={} category=\"{}\" location=\"{}\" returned=0",
        SOURCE,
        category,
        location);
    return List.of();
  }
}

package com.roslabs.aisales.businessintelligence.application.steps;

import com.roslabs.aisales.businessintelligence.application.*;
import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import org.springframework.stereotype.Component;

@Component
public class WebsiteDiscoveryStep implements EnrichmentStep {
  public String name() { return "WebsiteDiscoveryStep"; }

  public EnrichmentStepResult execute(CanonicalBusiness business) {
    return EnrichmentStepResult.unchanged("Framework only; no website discovery provider configured.");
  }
}

package com.roslabs.aisales.businessintelligence.application.steps;

import com.roslabs.aisales.businessintelligence.application.*;
import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import org.springframework.stereotype.Component;

@Component
public class SocialDiscoveryStep implements EnrichmentStep {
  public String name() { return "SocialDiscoveryStep"; }

  public EnrichmentStepResult execute(CanonicalBusiness business) {
    return EnrichmentStepResult.unchanged("Framework only; social discovery provider not configured.");
  }
}

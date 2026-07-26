package com.roslabs.aisales.businessintelligence.application.steps;

import com.roslabs.aisales.businessintelligence.application.*;
import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import org.springframework.stereotype.Component;

@Component
public class ContactExtractionStep implements EnrichmentStep {
  public String name() { return "ContactExtractionStep"; }

  public EnrichmentStepResult execute(CanonicalBusiness business) {
    return EnrichmentStepResult.unchanged("Framework only; contact extraction provider not configured.");
  }
}

package com.roslabs.aisales.businessintelligence.application.steps;

import com.roslabs.aisales.businessintelligence.application.*;
import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import org.springframework.stereotype.Component;

@Component
public class AIQualificationStep implements EnrichmentStep {
  public String name() { return "AIQualificationStep"; }

  public EnrichmentStepResult execute(CanonicalBusiness business) {
    return EnrichmentStepResult.unchanged("Framework only; AI qualification intentionally not implemented.");
  }
}

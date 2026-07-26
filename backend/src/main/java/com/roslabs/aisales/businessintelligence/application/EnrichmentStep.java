package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;

public interface EnrichmentStep {
  String name();

  EnrichmentStepResult execute(CanonicalBusiness business);
}

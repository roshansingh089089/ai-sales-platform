package com.roslabs.aisales.businessintelligence.application.steps;

import com.roslabs.aisales.businessintelligence.application.*;
import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import org.springframework.stereotype.Component;

@Component
public class WebsiteCrawlerStep implements EnrichmentStep {
  public String name() { return "WebsiteCrawlerStep"; }

  public EnrichmentStepResult execute(CanonicalBusiness business) {
    return EnrichmentStepResult.unchanged("Framework only; crawling intentionally not implemented.");
  }
}

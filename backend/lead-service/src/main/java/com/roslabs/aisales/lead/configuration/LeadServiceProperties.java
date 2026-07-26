package com.roslabs.aisales.lead.configuration;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

@ConfigurationProperties(prefix = "lead")
public record LeadServiceProperties(
    Automation automation, BusinessService businessService, ImportSettings importSettings) {
  public record Automation(
      String baseUrl,
      String internalToken,
      Duration connectionTimeout,
      Duration readTimeout,
      int maxAttempts) {}

  public record BusinessService(
      String baseUrl, Duration connectionTimeout, Duration readTimeout, String internalToken) {}

  public record ImportSettings(DataSize maxFileSize) {}
}

package com.roslabs.aisales.leaddiscovery.configuration;

import java.time.Duration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.*;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(LeadDiscoveryProperties.class)
public class LeadDiscoveryConfiguration {
  @Bean("geoapifyHttpClient")
  RestClient geoapifyHttpClient(
      RestClient.Builder builder,
      RestTemplateBuilder restTemplateBuilder,
      LeadDiscoveryProperties properties) {
    var requestFactory =
        restTemplateBuilder
            .connectTimeout(timeout(properties.connectionTimeout()))
            .readTimeout(timeout(properties.readTimeout()))
            .buildRequestFactory();
    return builder.baseUrl("https://api.geoapify.com").requestFactory(requestFactory).build();
  }

  private Duration timeout(Duration value) {
    return value == null ? Duration.ofSeconds(5) : value;
  }
}

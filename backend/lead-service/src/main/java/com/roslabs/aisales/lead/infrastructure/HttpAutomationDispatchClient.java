package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.application.AutomationDispatchClient;
import com.roslabs.aisales.lead.configuration.LeadServiceProperties;
import com.roslabs.aisales.lead.domain.SearchJob;
import java.time.Duration;
import org.slf4j.*;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpAutomationDispatchClient implements AutomationDispatchClient {
  private static final Logger log = LoggerFactory.getLogger(HttpAutomationDispatchClient.class);

  private final RestClient client;
  private final LeadServiceProperties properties;

  public HttpAutomationDispatchClient(RestClient.Builder builder, LeadServiceProperties properties) {
    this.properties = properties;
    var requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(properties.automation().connectionTimeout());
    requestFactory.setReadTimeout(properties.automation().readTimeout());
    client = builder.baseUrl(properties.automation().baseUrl()).requestFactory(requestFactory).build();
  }

  public void dispatch(SearchJob job) {
    RuntimeException last = null;
    for (int attempt = 1; attempt <= properties.automation().maxAttempts(); attempt++) {
      try {
        client
            .post()
            .uri("/internal/jobs")
            .header("X-Internal-Token", properties.automation().internalToken())
            .contentType(MediaType.APPLICATION_JSON)
            .body(
                new DispatchRequest(
                    job.getId().toString(), job.getQuery(), job.getLocation(), job.getMaxResults()))
            .retrieve()
            .toBodilessEntity();
        return;
      } catch (RuntimeException e) {
        last = e;
        log.warn("automation_dispatch_failed jobId={} attempt={}", job.getId(), attempt);
        sleep(Duration.ofMillis(150L * attempt));
      }
    }
    throw last == null ? new IllegalStateException("Automation dispatch failed") : last;
  }

  private void sleep(Duration duration) {
    try {
      Thread.sleep(duration.toMillis());
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }

  private record DispatchRequest(String id, String query, String location, int maxResults) {}
}

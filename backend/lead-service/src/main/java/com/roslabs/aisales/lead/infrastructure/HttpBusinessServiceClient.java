package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.application.BusinessServiceClient;
import com.roslabs.aisales.lead.configuration.LeadServiceProperties;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class HttpBusinessServiceClient implements BusinessServiceClient {
  private final RestClient restClient;
  private final LeadServiceProperties properties;

  public HttpBusinessServiceClient(LeadServiceProperties properties) {
    this.properties = properties;
    var requestFactory = new SimpleClientHttpRequestFactory();
    requestFactory.setConnectTimeout(properties.businessService().connectionTimeout());
    requestFactory.setReadTimeout(properties.businessService().readTimeout());
    restClient =
        RestClient.builder()
            .baseUrl(properties.businessService().baseUrl())
            .requestFactory(requestFactory)
            .build();
  }

  public UUID upsert(DiscoveredBusiness business) {
    var response =
        restClient
            .post()
            .uri("/api/v1/businesses")
            .contentType(MediaType.APPLICATION_JSON)
            .header("X-Internal-Token", properties.businessService().internalToken())
            .body(business)
            .retrieve()
            .body(BusinessResponse.class);
    if (response == null || response.id() == null) {
      throw new IllegalStateException("Business service returned an empty response");
    }
    return response.id();
  }

  private record BusinessResponse(UUID id) {}
}

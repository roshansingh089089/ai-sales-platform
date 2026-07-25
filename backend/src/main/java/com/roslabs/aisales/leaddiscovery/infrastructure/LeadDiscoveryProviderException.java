package com.roslabs.aisales.leaddiscovery.infrastructure;

import org.springframework.http.HttpStatusCode;

public class LeadDiscoveryProviderException extends RuntimeException {
  private final HttpStatusCode statusCode;

  public LeadDiscoveryProviderException(HttpStatusCode statusCode, String message) {
    super(message);
    this.statusCode = statusCode;
  }

  public HttpStatusCode statusCode() {
    return statusCode;
  }
}

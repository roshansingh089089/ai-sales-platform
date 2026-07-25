package com.roslabs.aisales.leaddiscovery.infrastructure;

public class LeadDiscoveryTimeoutException extends RuntimeException {
  public LeadDiscoveryTimeoutException(String message) {
    super(message);
  }
}

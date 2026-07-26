package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.configuration.BusinessIntelligenceProperties;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Component;

@Component
public class SearchResultCache {
  private final BusinessIntelligenceProperties properties;
  private final Map<String, CacheEntry> entries = new LinkedHashMap<>();

  public SearchResultCache(BusinessIntelligenceProperties properties) {
    this.properties = properties;
  }

  public synchronized Optional<BusinessDiscoveryResult> get(String key) {
    var entry = entries.get(key);
    if (entry == null || entry.expiresAt().isBefore(Instant.now())) {
      entries.remove(key);
      return Optional.empty();
    }
    return Optional.of(entry.result());
  }

  public synchronized void put(String key, BusinessDiscoveryResult result) {
    while (entries.size() >= properties.searchCacheMaxEntries() && !entries.isEmpty()) {
      entries.remove(entries.keySet().iterator().next());
    }
    entries.put(key, new CacheEntry(result, Instant.now().plus(properties.searchCacheTtl())));
  }

  private record CacheEntry(BusinessDiscoveryResult result, Instant expiresAt) {}
}

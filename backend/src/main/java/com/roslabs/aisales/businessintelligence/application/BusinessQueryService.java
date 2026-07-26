package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.*;
import jakarta.persistence.EntityNotFoundException;
import java.util.List;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
public class BusinessQueryService {
  private final CanonicalBusinessRepository businesses;
  private final EnrichmentStatusRepository statuses;
  private final SearchHistoryRepository histories;

  public BusinessQueryService(
      CanonicalBusinessRepository businesses,
      EnrichmentStatusRepository statuses,
      SearchHistoryRepository histories) {
    this.businesses = businesses;
    this.statuses = statuses;
    this.histories = histories;
  }

  public Page<CanonicalBusiness> search(String query, int page, int size) {
    return businesses.search(query, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt")));
  }

  public CanonicalBusiness get(String id) {
    return businesses.findById(id).orElseThrow(() -> new EntityNotFoundException("Business not found"));
  }

  public EnrichmentStatus status(String id) {
    return statuses
        .findByBusinessId(id)
        .orElseGet(() -> new EnrichmentStatus(id, EnrichmentStepRegistry.names()));
  }

  public List<SearchHistory> recentSearches() {
    return histories.recent(20);
  }
}

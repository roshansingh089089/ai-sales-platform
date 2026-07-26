package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.EnrichmentStatus;
import java.util.Optional;

public interface EnrichmentStatusRepository {
  EnrichmentStatus save(EnrichmentStatus status);

  Optional<EnrichmentStatus> findByBusinessId(String businessId);
}

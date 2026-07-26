package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.application.LeadImportBatchRepository;
import com.roslabs.aisales.lead.domain.*;
import java.util.Optional;
import org.springframework.stereotype.Repository;

@Repository
public class LeadImportBatchRepositoryAdapter implements LeadImportBatchRepository {
  private final SpringDataLeadImportBatchRepository repository;

  public LeadImportBatchRepositoryAdapter(SpringDataLeadImportBatchRepository repository) {
    this.repository = repository;
  }

  public LeadImportBatch save(LeadImportBatch batch) {
    return repository.save(batch);
  }

  public Optional<LeadImportBatch> findByJobAndProviderAndChecksum(
      SearchJob job, String provider, String checksum) {
    return repository.findByJobAndProviderAndChecksum(job, provider, checksum);
  }
}

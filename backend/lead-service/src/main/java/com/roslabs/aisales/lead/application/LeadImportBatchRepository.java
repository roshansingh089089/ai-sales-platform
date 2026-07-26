package com.roslabs.aisales.lead.application;

import com.roslabs.aisales.lead.domain.*;
import java.util.Optional;

public interface LeadImportBatchRepository {
  LeadImportBatch save(LeadImportBatch batch);

  Optional<LeadImportBatch> findByJobAndProviderAndChecksum(
      SearchJob job, String provider, String checksum);
}

package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.domain.*;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataLeadImportBatchRepository extends JpaRepository<LeadImportBatch, UUID> {
  Optional<LeadImportBatch> findByJobAndProviderAndChecksum(
      SearchJob job, String provider, String checksum);
}

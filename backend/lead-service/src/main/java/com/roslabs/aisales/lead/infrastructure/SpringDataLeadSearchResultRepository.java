package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.domain.*;
import java.util.UUID;
import org.springframework.data.jpa.repository.*;

interface SpringDataLeadSearchResultRepository
    extends JpaRepository<LeadSearchResult, UUID>, JpaSpecificationExecutor<LeadSearchResult> {
  boolean existsByJobAndBusinessId(SearchJob job, UUID businessId);
}

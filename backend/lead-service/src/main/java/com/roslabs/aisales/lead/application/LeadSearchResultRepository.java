package com.roslabs.aisales.lead.application;

import com.roslabs.aisales.lead.domain.*;
import java.util.UUID;
import org.springframework.data.domain.*;

public interface LeadSearchResultRepository {
  LeadSearchResult save(LeadSearchResult result);

  boolean existsByJobAndBusinessId(SearchJob job, UUID businessId);

  Page<LeadSearchResult> search(
      SearchJob job,
      String q,
      String category,
      String city,
      Boolean hasPhone,
      Boolean hasEmail,
      Boolean hasWebsite,
      Pageable pageable);
}

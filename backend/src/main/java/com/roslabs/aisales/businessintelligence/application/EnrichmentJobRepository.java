package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.*;
import java.util.*;

public interface EnrichmentJobRepository {
  EnrichmentJob save(EnrichmentJob job);

  List<EnrichmentJob> claimQueued(int limit);

  boolean existsOpenJobForBusiness(String businessId);
}

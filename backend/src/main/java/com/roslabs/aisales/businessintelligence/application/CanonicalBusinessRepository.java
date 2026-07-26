package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import java.util.*;
import org.springframework.data.domain.*;

public interface CanonicalBusinessRepository {
  CanonicalBusiness save(CanonicalBusiness business);

  Optional<CanonicalBusiness> findById(String id);

  Optional<CanonicalBusiness> findBySource(String source, String sourcePlaceId);

  Page<CanonicalBusiness> search(String query, Pageable pageable);
}

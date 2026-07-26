package com.roslabs.aisales.businessservice.application;

import com.roslabs.aisales.businessservice.domain.CanonicalBusiness;
import java.util.*;
import org.springframework.data.domain.*;

public interface BusinessRepository {
  CanonicalBusiness save(CanonicalBusiness business);

  Optional<CanonicalBusiness> findBySource(String source, String sourceRef);

  Optional<CanonicalBusiness> findDuplicate(UpsertBusinessCommand command);

  Optional<CanonicalBusiness> findById(UUID id);

  Page<CanonicalBusiness> search(String query, Pageable pageable);
}

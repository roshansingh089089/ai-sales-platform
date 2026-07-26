package com.roslabs.aisales.businessservice.infrastructure;

import com.roslabs.aisales.businessservice.domain.CanonicalBusiness;
import java.util.*;
import org.springframework.data.jpa.repository.*;

interface SpringDataBusinessRepository
    extends JpaRepository<CanonicalBusiness, UUID>, JpaSpecificationExecutor<CanonicalBusiness> {
  Optional<CanonicalBusiness> findBySourceAndSourceRef(String source, String sourceRef);

  Optional<CanonicalBusiness> findFirstByNormalizedWebsiteDomain(String normalizedWebsiteDomain);

  Optional<CanonicalBusiness> findFirstByNormalizedPhoneNumber(String normalizedPhoneNumber);

  Optional<CanonicalBusiness> findFirstByNormalizedNameAndNormalizedAddress(
      String normalizedName, String normalizedAddress);
}

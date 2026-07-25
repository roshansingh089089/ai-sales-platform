package com.roslabs.aisales.business.infrastructure;

import com.roslabs.aisales.business.domain.Business;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BusinessRepository
    extends JpaRepository<Business, UUID>, JpaSpecificationExecutor<Business> {}

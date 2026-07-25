package com.roslabs.aisales.opportunity.infrastructure;

import com.roslabs.aisales.opportunity.domain.Opportunity;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OpportunityRepository extends JpaRepository<Opportunity, UUID> {
  List<Opportunity> findByBusinessIdOrderByCreatedAtDesc(UUID id);
}

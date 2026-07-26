package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.domain.SearchJob;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataSearchJobRepository extends JpaRepository<SearchJob, UUID> {
  Optional<SearchJob> findByIdempotencyKey(String idempotencyKey);
}

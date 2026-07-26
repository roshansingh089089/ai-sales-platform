package com.roslabs.aisales.lead.application;

import com.roslabs.aisales.lead.domain.SearchJob;
import java.util.*;
import org.springframework.data.domain.*;

public interface SearchJobRepository {
  SearchJob save(SearchJob job);

  Optional<SearchJob> findById(UUID id);

  Optional<SearchJob> findByIdempotencyKey(String idempotencyKey);

  Page<SearchJob> findAll(Pageable pageable);
}

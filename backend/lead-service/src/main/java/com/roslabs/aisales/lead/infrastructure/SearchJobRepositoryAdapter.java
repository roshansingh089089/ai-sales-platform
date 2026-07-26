package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.application.SearchJobRepository;
import com.roslabs.aisales.lead.domain.SearchJob;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Repository;

@Repository
public class SearchJobRepositoryAdapter implements SearchJobRepository {
  private final SpringDataSearchJobRepository repository;

  public SearchJobRepositoryAdapter(SpringDataSearchJobRepository repository) {
    this.repository = repository;
  }

  public SearchJob save(SearchJob job) {
    return repository.save(job);
  }

  public Optional<SearchJob> findById(UUID id) {
    return repository.findById(id);
  }

  public Optional<SearchJob> findByIdempotencyKey(String idempotencyKey) {
    return repository.findByIdempotencyKey(idempotencyKey);
  }

  public Page<SearchJob> findAll(Pageable pageable) {
    return repository.findAll(pageable);
  }
}

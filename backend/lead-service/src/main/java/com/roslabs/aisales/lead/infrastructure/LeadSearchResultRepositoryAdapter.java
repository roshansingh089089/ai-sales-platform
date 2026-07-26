package com.roslabs.aisales.lead.infrastructure;

import com.roslabs.aisales.lead.application.LeadSearchResultRepository;
import com.roslabs.aisales.lead.domain.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

@Repository
public class LeadSearchResultRepositoryAdapter implements LeadSearchResultRepository {
  private final SpringDataLeadSearchResultRepository repository;

  public LeadSearchResultRepositoryAdapter(SpringDataLeadSearchResultRepository repository) {
    this.repository = repository;
  }

  public LeadSearchResult save(LeadSearchResult result) {
    return repository.save(result);
  }

  public boolean existsByJobAndBusinessId(SearchJob job, UUID businessId) {
    return repository.existsByJobAndBusinessId(job, businessId);
  }

  public Page<LeadSearchResult> search(
      SearchJob job,
      String q,
      String category,
      String city,
      Boolean hasPhone,
      Boolean hasEmail,
      Boolean hasWebsite,
      Pageable pageable) {
    Specification<LeadSearchResult> spec = (root, cq, cb) -> cb.equal(root.get("job"), job);
    if (q != null && !q.isBlank()) {
      spec =
          spec.and(
              (root, cq, cb) ->
                  cb.like(cb.lower(root.get("businessName")), "%" + q.toLowerCase(Locale.ROOT) + "%"));
    }
    if (category != null && !category.isBlank()) {
      spec = spec.and((root, cq, cb) -> cb.equal(root.get("category"), category));
    }
    if (city != null && !city.isBlank()) {
      spec = spec.and((root, cq, cb) -> cb.equal(cb.lower(root.get("city")), city.toLowerCase(Locale.ROOT)));
    }
    if (hasPhone != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("hasPhone"), hasPhone));
    if (hasEmail != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("hasEmail"), hasEmail));
    if (hasWebsite != null) spec = spec.and((root, cq, cb) -> cb.equal(root.get("hasWebsite"), hasWebsite));
    return repository.findAll(spec, pageable);
  }
}

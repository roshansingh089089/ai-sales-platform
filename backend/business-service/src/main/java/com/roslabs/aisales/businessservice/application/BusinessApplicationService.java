package com.roslabs.aisales.businessservice.application;

import com.roslabs.aisales.businessservice.domain.CanonicalBusiness;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
public class BusinessApplicationService {
  private static final String SYSTEM_ACTOR = "system";
  private final BusinessRepository repository;

  public BusinessApplicationService(BusinessRepository repository) {
    this.repository = repository;
  }

  public CanonicalBusiness upsert(UpsertBusinessCommand command) {
    var business =
        repository
            .findDuplicate(command)
            .orElseGet(
                () ->
                    new CanonicalBusiness(
                        command.name(),
                        command.website(),
                        command.phoneNumber(),
                        command.email(),
                        command.address(),
                        command.city(),
                        command.state(),
                        command.country(),
                        command.postalCode(),
                        command.category(),
                        command.source(),
                        command.sourceRef(),
                        command.sourceUrl(),
                        command.rating(),
                        command.reviewCount(),
                        command.latitude(),
                        command.longitude(),
                        SYSTEM_ACTOR));
    business.mergeMissingFields(
        command.website(),
        command.phoneNumber(),
        command.email(),
        command.address(),
        command.city(),
        command.state(),
        command.country(),
        command.postalCode(),
        command.category(),
        command.sourceUrl(),
        command.rating(),
        command.reviewCount(),
        command.latitude(),
        command.longitude(),
        SYSTEM_ACTOR);
    return repository.save(business);
  }

  public Page<CanonicalBusiness> search(String query, int page, int size) {
    return repository.search(query, PageRequest.of(page, size));
  }

  public CanonicalBusiness get(UUID id) {
    return repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Business not found"));
  }
}

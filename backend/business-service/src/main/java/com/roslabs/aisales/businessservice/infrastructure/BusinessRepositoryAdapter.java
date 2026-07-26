package com.roslabs.aisales.businessservice.infrastructure;

import com.roslabs.aisales.businessservice.application.BusinessRepository;
import com.roslabs.aisales.businessservice.domain.CanonicalBusiness;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;

@Repository
public class BusinessRepositoryAdapter implements BusinessRepository {
  private final SpringDataBusinessRepository repository;

  public BusinessRepositoryAdapter(SpringDataBusinessRepository repository) {
    this.repository = repository;
  }

  public CanonicalBusiness save(CanonicalBusiness business) {
    return repository.save(business);
  }

  public Optional<CanonicalBusiness> findBySource(String source, String sourceRef) {
    if (isBlank(source) || isBlank(sourceRef)) return Optional.empty();
    return repository.findBySourceAndSourceRef(source, sourceRef);
  }

  public Optional<CanonicalBusiness> findDuplicate(
      com.roslabs.aisales.businessservice.application.UpsertBusinessCommand command) {
    return findBySource(command.source(), command.sourceRef())
        .or(() -> byDomain(command.website()))
        .or(() -> byPhone(command.phoneNumber()))
        .or(() -> byNameAndAddress(command.name(), command.address()));
  }

  public Optional<CanonicalBusiness> findById(UUID id) {
    return repository.findById(id);
  }

  public Page<CanonicalBusiness> search(String query, Pageable pageable) {
    if (query == null || query.isBlank()) return repository.findAll(pageable);
    Specification<CanonicalBusiness> spec =
        (root, cq, cb) ->
            cb.like(cb.lower(root.get("name")), "%" + query.toLowerCase(Locale.ROOT) + "%");
    return repository.findAll(spec, pageable);
  }

  private Optional<CanonicalBusiness> byDomain(String website) {
    var domain = normalizeDomain(website);
    return isBlank(domain) ? Optional.empty() : repository.findFirstByNormalizedWebsiteDomain(domain);
  }

  private Optional<CanonicalBusiness> byPhone(String phoneNumber) {
    var phone = normalizePhone(phoneNumber);
    return isBlank(phone) ? Optional.empty() : repository.findFirstByNormalizedPhoneNumber(phone);
  }

  private Optional<CanonicalBusiness> byNameAndAddress(String name, String address) {
    var normalizedName = normalize(name);
    var normalizedAddress = normalize(address);
    if (isBlank(normalizedName) || isBlank(normalizedAddress)) return Optional.empty();
    return repository.findFirstByNormalizedNameAndNormalizedAddress(normalizedName, normalizedAddress);
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String normalize(String value) {
    return value == null ? null : value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", " ").trim();
  }

  private String normalizePhone(String value) {
    if (value == null) return null;
    var normalized = value.replaceAll("[^0-9+]+", "");
    return normalized.isBlank() ? null : normalized;
  }

  private String normalizeDomain(String value) {
    if (value == null || value.isBlank()) return null;
    var normalized = value.toLowerCase(Locale.ROOT).trim();
    normalized = normalized.replaceFirst("^https?://", "").replaceFirst("^www\\.", "");
    var slash = normalized.indexOf('/');
    if (slash >= 0) normalized = normalized.substring(0, slash);
    return normalized.isBlank() ? null : normalized;
  }
}

package com.roslabs.aisales.business.application;

import com.roslabs.aisales.business.domain.*;
import com.roslabs.aisales.business.infrastructure.BusinessRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BusinessService {
  private final BusinessRepository repository;

  public BusinessService(BusinessRepository r) {
    repository = r;
  }

  @Transactional
  public Business create(
      String n, String w, String i, String c, String s, String country, String d) {
    return repository.save(new Business(n, w, i, c, s, country, d));
  }

  @Transactional(readOnly = true)
  public Business get(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Business not found"));
  }

  @Transactional(readOnly = true)
  public Page<Business> list(int page, int size) {
    return repository.findAll(PageRequest.of(page, size, Sort.by("createdAt").descending()));
  }

  @Transactional
  public Business update(
      UUID id,
      String n,
      String w,
      String i,
      String c,
      String s,
      String country,
      String d,
      BusinessStatus status) {
    var b = get(id);
    b.update(n, w, i, c, s, country, d, status);
    return b;
  }
}

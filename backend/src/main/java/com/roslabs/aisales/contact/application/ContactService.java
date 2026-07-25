package com.roslabs.aisales.contact.application;

import com.roslabs.aisales.business.application.BusinessService;
import com.roslabs.aisales.contact.domain.*;
import com.roslabs.aisales.contact.infrastructure.ContactRepository;
import jakarta.persistence.EntityNotFoundException;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ContactService {
  private final ContactRepository repository;
  private final BusinessService businesses;

  public ContactService(ContactRepository r, BusinessService b) {
    repository = r;
    businesses = b;
  }

  @Transactional
  public Contact create(
      UUID businessId,
      String f,
      String l,
      String d,
      String p,
      String e,
      PreferredContactMethod m,
      String n) {
    return repository.save(new Contact(businesses.get(businessId), f, l, d, p, e, m, n));
  }

  @Transactional(readOnly = true)
  public Contact get(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Contact not found"));
  }

  @Transactional(readOnly = true)
  public List<Contact> list(UUID id) {
    businesses.get(id);
    return repository.findByBusinessIdOrderByCreatedAtDesc(id);
  }

  @Transactional
  public Contact update(
      UUID id,
      String f,
      String l,
      String d,
      String p,
      String e,
      PreferredContactMethod m,
      boolean blocked,
      String n) {
    var c = get(id);
    c.update(f, l, d, p, e, m, blocked, n);
    return c;
  }
}

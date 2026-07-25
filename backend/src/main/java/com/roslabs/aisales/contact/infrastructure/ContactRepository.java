package com.roslabs.aisales.contact.infrastructure;

import com.roslabs.aisales.contact.domain.Contact;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ContactRepository extends JpaRepository<Contact, UUID> {
  List<Contact> findByBusinessIdOrderByCreatedAtDesc(UUID businessId);
}

package com.roslabs.aisales.opportunity.application;

import com.roslabs.aisales.business.application.BusinessService;
import com.roslabs.aisales.opportunity.domain.*;
import com.roslabs.aisales.opportunity.infrastructure.OpportunityRepository;
import jakarta.persistence.EntityNotFoundException;
import java.math.BigDecimal;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpportunityService {
  private final OpportunityRepository repository;
  private final BusinessService businesses;

  public OpportunityService(OpportunityRepository r, BusinessService b) {
    repository = r;
    businesses = b;
  }

  @Transactional
  public Opportunity create(
      UUID id, String t, String p, String s, BigDecimal c, String e, OpportunityStatus status) {
    var opportunity = new Opportunity(businesses.get(id), t, p, s, c, e);
    opportunity.setStatus(status);
    return repository.save(opportunity);
  }

  @Transactional(readOnly = true)
  public List<Opportunity> list(UUID id) {
    businesses.get(id);
    return repository.findByBusinessIdOrderByCreatedAtDesc(id);
  }

  @Transactional(readOnly = true)
  public Opportunity get(UUID id) {
    return repository
        .findById(id)
        .orElseThrow(() -> new EntityNotFoundException("Opportunity not found"));
  }
}

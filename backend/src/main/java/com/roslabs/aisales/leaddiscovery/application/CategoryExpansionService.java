package com.roslabs.aisales.leaddiscovery.application;

import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class CategoryExpansionService {
  public List<String> expand(String category) {
    var normalized = normalize(category);
    if ("dentist".equals(normalized)
        || "dental".equals(normalized)
        || "dental clinic".equals(normalized)
        || "healthcare dentist".equals(normalized)) {
      return List.of("healthcare.dentist");
    }
    return List.of(category);
  }

  private String normalize(String value) {
    return value == null
        ? ""
        : value.toLowerCase(Locale.ROOT).replace('_', ' ').replace('.', ' ').trim();
  }
}

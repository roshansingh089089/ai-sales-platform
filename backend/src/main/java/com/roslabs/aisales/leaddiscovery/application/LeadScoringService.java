package com.roslabs.aisales.leaddiscovery.application;

import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class LeadScoringService {
  public LeadScore score(LeadCandidate candidate, String requestedCategory) {
    int score = 0;
    var reasons = new ArrayList<String>();

    if (matchesCategory(candidate.categories(), requestedCategory)) {
      score += 30;
      reasons.add("Matches requested category");
    }
    if (candidate.phoneNumber() != null && !candidate.phoneNumber().isBlank()) {
      score += 20;
      reasons.add("Phone available");
    }
    if (candidate.website() == null || candidate.website().isBlank()) {
      score += 20;
      reasons.add("No website");
    }
    if (candidate.distanceMeters() != null && candidate.distanceMeters() <= 2000) {
      score += 15;
      reasons.add("Within 2 km of requested location");
    } else if (candidate.distanceMeters() != null && candidate.distanceMeters() <= 5000) {
      score += 10;
      reasons.add("Within 5 km of requested location");
    } else if (candidate.distanceMeters() != null) {
      score += 5;
      reasons.add("Within requested search radius");
    }
    if (hasValidBusinessData(candidate)) {
      score += 15;
      reasons.add("Valid business data");
    }

    return new LeadScore(Math.min(score, 100), qualify(score), reasons);
  }

  private boolean matchesCategory(List<String> categories, String requestedCategory) {
    if (categories == null || categories.isEmpty() || requestedCategory == null) {
      return false;
    }
    var requested = normalize(requestedCategory);
    return categories.stream()
        .map(this::normalize)
        .anyMatch(category -> requested.contains(category) || category.contains(requested));
  }

  private boolean hasValidBusinessData(LeadCandidate candidate) {
    return candidate.sourcePlaceId() != null
        && !candidate.sourcePlaceId().isBlank()
        && candidate.businessName() != null
        && !candidate.businessName().isBlank()
        && candidate.address() != null
        && !candidate.address().isBlank()
        && candidate.latitude() != null
        && candidate.longitude() != null;
  }

  private String normalize(String value) {
    return value.toLowerCase(Locale.ROOT).replace('_', ' ').replace('.', ' ').trim();
  }

  private Qualification qualify(int score) {
    if (score >= 80) return Qualification.HIGH;
    if (score >= 60) return Qualification.MEDIUM;
    return Qualification.LOW;
  }
}

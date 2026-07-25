package com.roslabs.aisales.callbrief.infrastructure;

import com.roslabs.aisales.callbrief.domain.CallBrief;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallBriefRepository extends JpaRepository<CallBrief, UUID> {
  List<CallBrief> findByBusinessIdOrderByCreatedAtDesc(UUID id);
}

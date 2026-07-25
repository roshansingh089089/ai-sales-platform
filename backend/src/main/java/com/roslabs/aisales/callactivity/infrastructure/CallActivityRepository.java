package com.roslabs.aisales.callactivity.infrastructure;

import com.roslabs.aisales.callactivity.domain.CallActivity;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CallActivityRepository extends JpaRepository<CallActivity, UUID> {
  List<CallActivity> findByBusinessIdOrderByCreatedAtDesc(UUID id);

  List<CallActivity> findTop50ByOrderByCreatedAtDesc();
}

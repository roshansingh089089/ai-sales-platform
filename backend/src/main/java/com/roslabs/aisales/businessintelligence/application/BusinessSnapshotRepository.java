package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.BusinessSnapshot;

public interface BusinessSnapshotRepository {
  BusinessSnapshot save(BusinessSnapshot snapshot);
}

package com.roslabs.aisales.businessintelligence.infrastructure;

import com.roslabs.aisales.businessintelligence.application.BusinessSnapshotRepository;
import com.roslabs.aisales.businessintelligence.domain.BusinessSnapshot;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MongoBusinessSnapshotRepository implements BusinessSnapshotRepository {
  private final MongoTemplate mongo;

  public MongoBusinessSnapshotRepository(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public BusinessSnapshot save(BusinessSnapshot snapshot) {
    snapshot.touch();
    return mongo.save(snapshot);
  }
}

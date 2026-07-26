package com.roslabs.aisales.businessintelligence.infrastructure;

import com.roslabs.aisales.businessintelligence.application.EnrichmentStatusRepository;
import com.roslabs.aisales.businessintelligence.domain.EnrichmentStatus;
import java.util.Optional;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

@Repository
public class MongoEnrichmentStatusRepository implements EnrichmentStatusRepository {
  private final MongoTemplate mongo;

  public MongoEnrichmentStatusRepository(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public EnrichmentStatus save(EnrichmentStatus status) {
    status.touch();
    return mongo.save(status);
  }

  public Optional<EnrichmentStatus> findByBusinessId(String businessId) {
    return Optional.ofNullable(
        mongo.findOne(Query.query(Criteria.where("businessId").is(businessId)), EnrichmentStatus.class));
  }
}

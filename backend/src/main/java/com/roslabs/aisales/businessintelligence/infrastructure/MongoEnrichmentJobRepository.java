package com.roslabs.aisales.businessintelligence.infrastructure;

import com.roslabs.aisales.businessintelligence.application.EnrichmentJobRepository;
import com.roslabs.aisales.businessintelligence.domain.*;
import java.util.*;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

@Repository
public class MongoEnrichmentJobRepository implements EnrichmentJobRepository {
  private final MongoTemplate mongo;

  public MongoEnrichmentJobRepository(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public EnrichmentJob save(EnrichmentJob job) {
    job.touch();
    return mongo.save(job);
  }

  public List<EnrichmentJob> claimQueued(int limit) {
    var query =
        Query.query(
                Criteria.where("status")
                    .in(EnrichmentJobStatus.QUEUED, EnrichmentJobStatus.RETRYABLE_FAILED))
            .with(Sort.by(Sort.Direction.ASC, "createdAt"))
            .limit(limit);
    return mongo.find(query, EnrichmentJob.class);
  }

  public boolean existsOpenJobForBusiness(String businessId) {
    var query =
        Query.query(
            Criteria.where("businessId")
                .is(businessId)
                .and("status")
                .in(
                    EnrichmentJobStatus.QUEUED,
                    EnrichmentJobStatus.RUNNING,
                    EnrichmentJobStatus.RETRYABLE_FAILED));
    return mongo.exists(query, EnrichmentJob.class);
  }
}

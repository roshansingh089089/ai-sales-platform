package com.roslabs.aisales.businessintelligence.infrastructure;

import com.roslabs.aisales.businessintelligence.application.CanonicalBusinessRepository;
import com.roslabs.aisales.businessintelligence.domain.CanonicalBusiness;
import java.util.Optional;
import org.springframework.data.domain.*;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.*;
import org.springframework.stereotype.Repository;

@Repository
public class MongoCanonicalBusinessRepository implements CanonicalBusinessRepository {
  private final MongoTemplate mongo;

  public MongoCanonicalBusinessRepository(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public CanonicalBusiness save(CanonicalBusiness business) {
    business.touch();
    return mongo.save(business);
  }

  public Optional<CanonicalBusiness> findById(String id) {
    return Optional.ofNullable(mongo.findById(id, CanonicalBusiness.class));
  }

  public Optional<CanonicalBusiness> findBySource(String source, String sourcePlaceId) {
    var query =
        Query.query(
            Criteria.where("sources")
                .elemMatch(Criteria.where("source").is(source).and("sourcePlaceId").is(sourcePlaceId)));
    return Optional.ofNullable(mongo.findOne(query, CanonicalBusiness.class));
  }

  public Page<CanonicalBusiness> search(String queryText, Pageable pageable) {
    var criteria = new Criteria();
    if (queryText != null && !queryText.isBlank()) {
      var pattern = ".*" + java.util.regex.Pattern.quote(queryText.trim()) + ".*";
      criteria =
          new Criteria()
              .orOperator(
                  Criteria.where("businessName").regex(pattern, "i"),
                  Criteria.where("address").regex(pattern, "i"),
                  Criteria.where("categories").regex(pattern, "i"));
    }
    var query = Query.query(criteria).with(pageable);
    var count = mongo.count(Query.query(criteria), CanonicalBusiness.class);
    return new PageImpl<>(mongo.find(query, CanonicalBusiness.class), pageable, count);
  }
}

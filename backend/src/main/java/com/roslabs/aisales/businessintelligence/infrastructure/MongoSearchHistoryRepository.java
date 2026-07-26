package com.roslabs.aisales.businessintelligence.infrastructure;

import com.roslabs.aisales.businessintelligence.application.SearchHistoryRepository;
import com.roslabs.aisales.businessintelligence.domain.SearchHistory;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Repository;

@Repository
public class MongoSearchHistoryRepository implements SearchHistoryRepository {
  private final MongoTemplate mongo;

  public MongoSearchHistoryRepository(MongoTemplate mongo) {
    this.mongo = mongo;
  }

  public SearchHistory save(SearchHistory history) {
    history.touch();
    return mongo.save(history);
  }

  public List<SearchHistory> recent(int limit) {
    return mongo.find(
        new Query().with(Sort.by(Sort.Direction.DESC, "createdAt")).limit(limit),
        SearchHistory.class);
  }
}

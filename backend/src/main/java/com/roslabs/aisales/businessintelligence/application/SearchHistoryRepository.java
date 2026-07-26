package com.roslabs.aisales.businessintelligence.application;

import com.roslabs.aisales.businessintelligence.domain.SearchHistory;
import java.util.List;

public interface SearchHistoryRepository {
  SearchHistory save(SearchHistory history);

  List<SearchHistory> recent(int limit);
}

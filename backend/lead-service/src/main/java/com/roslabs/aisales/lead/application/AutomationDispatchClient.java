package com.roslabs.aisales.lead.application;

import com.roslabs.aisales.lead.domain.SearchJob;

public interface AutomationDispatchClient {
  void dispatch(SearchJob job);
}

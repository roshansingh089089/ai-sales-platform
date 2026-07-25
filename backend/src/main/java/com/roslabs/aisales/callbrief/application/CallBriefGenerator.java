package com.roslabs.aisales.callbrief.application;

import com.roslabs.aisales.callbrief.domain.GeneratedCallBrief;

public interface CallBriefGenerator {
  GeneratedCallBrief generate(GenerateCallBriefCommand command);
}

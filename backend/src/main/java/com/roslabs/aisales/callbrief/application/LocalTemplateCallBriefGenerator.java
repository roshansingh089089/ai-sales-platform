package com.roslabs.aisales.callbrief.application;

import com.roslabs.aisales.callbrief.domain.GeneratedCallBrief;
import org.springframework.stereotype.Component;

@Component
public class LocalTemplateCallBriefGenerator implements CallBriefGenerator {
  public GeneratedCallBrief generate(GenerateCallBriefCommand c) {
    String industry = blank(c.industry(), "their industry"),
        role = blank(c.designation(), "business leader");
    return new GeneratedCallBrief(
        "Understand whether "
            + c.businessName()
            + " needs help with "
            + blank(c.problem(), "a software workflow"),
        "Hello, I’m Roshan. I build practical software for businesses. I’m calling because I noticed "
            + c.businessName()
            + " works in "
            + industry
            + ".",
        "Current process and friction\nImpact on time, cost, or customers\nFit of: "
            + blank(c.solution(), "a focused software solution"),
        "How do you handle this today?\nWhere does the process slow down?\nWho else should be involved in evaluating a change?",
        "No current budget\nExisting tools are sufficient\nTiming is not right",
        "Offer a small discovery step without commitment\nFocus on measurable workflow value\nRespect timing and ask permission to follow up",
        "Agree on a short discovery conversation with the " + role + ".");
  }

  private String blank(String v, String fallback) {
    return v == null || v.isBlank() ? fallback : v;
  }
}

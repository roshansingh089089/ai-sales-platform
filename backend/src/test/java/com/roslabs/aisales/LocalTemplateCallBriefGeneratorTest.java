package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.assertThat;

import com.roslabs.aisales.callbrief.application.*;
import org.junit.jupiter.api.Test;

class LocalTemplateCallBriefGeneratorTest {
  @Test
  void createsDeterministicUsefulBrief() {
    var g = new LocalTemplateCallBriefGenerator();
    var c =
        new GenerateCallBriefCommand(
            "Acme",
            "Logistics",
            "Moves freight",
            "Manual scheduling",
            "Scheduling portal",
            "Operations Head");
    assertThat(g.generate(c)).isEqualTo(g.generate(c));
    assertThat(g.generate(c).introduction()).contains("Acme", "Logistics");
    assertThat(g.generate(c).keyTalkingPoints()).contains("Scheduling portal");
  }
}

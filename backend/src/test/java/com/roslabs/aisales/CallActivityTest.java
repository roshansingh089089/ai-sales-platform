package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.assertThat;

import com.roslabs.aisales.callactivity.domain.*;
import org.junit.jupiter.api.Test;

class CallActivityTest {
  @Test
  void qualifyingOutcomesNeedFollowUp() {
    assertThat(
            new CallActivity(
                    null,
                    null,
                    null,
                    null,
                    null,
                    CallOutcome.INTERESTED,
                    null,
                    CustomerInterest.HIGH,
                    false,
                    null,
                    null)
                .needsFollowUp())
        .isTrue();
  }
}

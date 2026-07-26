package com.roslabs.aisales.lead.domain;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;

class SearchJobTest {
  @Test
  void followsExpectedAutomationLifecycle() {
    var job = new SearchJob("dentists", "HSR Layout, Bengaluru", 20, "idem-1");

    job.transitionTo(SearchJobStatus.BROWSER_STARTING, "browser");
    job.transitionTo(SearchJobStatus.SEARCHING, "searching");
    job.transitionTo(SearchJobStatus.EXPORTING, "exporting");
    job.transitionTo(SearchJobStatus.DOWNLOADING, "downloading");
    job.transitionTo(SearchJobStatus.IMPORTING, "importing");
    job.completeImport(18, 2);

    assertThat(job.getStatus()).isEqualTo(SearchJobStatus.COMPLETED);
    assertThat(job.getProgressPercentage()).isEqualTo(100);
    assertThat(job.getResultCount()).isEqualTo(18);
    assertThat(job.getDuplicateCount()).isEqualTo(2);
  }

  @Test
  void rejectsSkippedTransitions() {
    var job = new SearchJob("dentists", "HSR Layout, Bengaluru", 20, null);

    assertThatThrownBy(() -> job.transitionTo(SearchJobStatus.DOWNLOADING, "skip"))
        .isInstanceOf(IllegalStateException.class)
        .hasMessageContaining("Invalid search job transition");
  }
}

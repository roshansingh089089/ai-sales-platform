package com.roslabs.aisales.common.domain;

import java.time.Instant;

public record AuditMetadata(
    Instant createdAt, Instant updatedAt, String createdBy, String updatedBy, long version) {
  public static AuditMetadata initial(String actor) {
    var now = Instant.now();
    return new AuditMetadata(now, now, actor, actor, 0);
  }

  public AuditMetadata updated(String actor) {
    return new AuditMetadata(createdAt, Instant.now(), createdBy, actor, version + 1);
  }
}

package com.roslabs.aisales.shared.api;

import java.time.Instant;
import java.util.*;

public final class ApiSupport {
  private ApiSupport() {}

  public record PageResponse<T>(
      List<T> content, int page, int size, long totalElements, int totalPages) {}

  public record ApiError(
      Instant timestamp,
      int status,
      String code,
      String message,
      String path,
      String correlationId,
      List<FieldError> fieldErrors) {}

  public record FieldError(String field, String message) {}
}

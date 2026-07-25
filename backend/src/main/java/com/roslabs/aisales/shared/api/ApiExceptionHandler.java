package com.roslabs.aisales.shared.api;

import com.roslabs.aisales.leaddiscovery.infrastructure.*;
import jakarta.persistence.EntityNotFoundException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<ApiSupport.ApiError> validation(
      MethodArgumentNotValidException e, HttpServletRequest r) {
    var fields =
        e.getBindingResult().getFieldErrors().stream()
            .map(x -> new ApiSupport.FieldError(x.getField(), x.getDefaultMessage()))
            .toList();
    return error(
        HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Request validation failed", r, fields);
  }

  @ExceptionHandler(EntityNotFoundException.class)
  ResponseEntity<ApiSupport.ApiError> missing(EntityNotFoundException e, HttpServletRequest r) {
    return error(HttpStatus.NOT_FOUND, "NOT_FOUND", e.getMessage(), r, List.of());
  }

  @ExceptionHandler(IllegalArgumentException.class)
  ResponseEntity<ApiSupport.ApiError> bad(IllegalArgumentException e, HttpServletRequest r) {
    return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", e.getMessage(), r, List.of());
  }

  @ExceptionHandler(IllegalStateException.class)
  ResponseEntity<ApiSupport.ApiError> config(IllegalStateException e, HttpServletRequest r) {
    return error(
        HttpStatus.SERVICE_UNAVAILABLE, "CONFIGURATION_ERROR", e.getMessage(), r, List.of());
  }

  @ExceptionHandler(LeadDiscoveryTimeoutException.class)
  ResponseEntity<ApiSupport.ApiError> timeout(
      LeadDiscoveryTimeoutException e, HttpServletRequest r) {
    return error(
        HttpStatus.GATEWAY_TIMEOUT, "LEAD_DISCOVERY_TIMEOUT", e.getMessage(), r, List.of());
  }

  @ExceptionHandler(LeadDiscoveryProviderException.class)
  ResponseEntity<ApiSupport.ApiError> upstream(
      LeadDiscoveryProviderException e, HttpServletRequest r) {
    var status =
        e.statusCode().is4xxClientError() ? HttpStatus.BAD_GATEWAY : HttpStatus.SERVICE_UNAVAILABLE;
    return error(status, "LEAD_DISCOVERY_UPSTREAM_ERROR", e.getMessage(), r, List.of());
  }

  private ResponseEntity<ApiSupport.ApiError> error(
      HttpStatus s,
      String code,
      String msg,
      HttpServletRequest r,
      List<ApiSupport.FieldError> fields) {
    return ResponseEntity.status(s)
        .body(
            new ApiSupport.ApiError(
                Instant.now(),
                s.value(),
                code,
                msg,
                r.getRequestURI(),
                Optional.ofNullable(r.getHeader("X-Correlation-ID")).orElse("unknown"),
                fields));
  }
}

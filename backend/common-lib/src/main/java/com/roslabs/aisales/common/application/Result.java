package com.roslabs.aisales.common.application;

import java.util.Objects;
import java.util.function.Function;

public sealed interface Result<T> permits Result.Success, Result.Failure {
  boolean isSuccess();

  T value();

  ErrorDetail error();

  static <T> Result<T> success(T value) {
    return new Success<>(value);
  }

  static <T> Result<T> failure(String code, String message) {
    return new Failure<>(new ErrorDetail(code, message));
  }

  default <R> Result<R> map(Function<T, R> mapper) {
    if (!isSuccess()) return failure(error().code(), error().message());
    return success(mapper.apply(value()));
  }

  record Success<T>(T value) implements Result<T> {
    public Success {
      Objects.requireNonNull(value, "value must not be null");
    }

    public boolean isSuccess() {
      return true;
    }

    public ErrorDetail error() {
      throw new IllegalStateException("Successful result has no error");
    }
  }

  record Failure<T>(ErrorDetail error) implements Result<T> {
    public boolean isSuccess() {
      return false;
    }

    public T value() {
      throw new IllegalStateException("Failed result has no value");
    }
  }
}

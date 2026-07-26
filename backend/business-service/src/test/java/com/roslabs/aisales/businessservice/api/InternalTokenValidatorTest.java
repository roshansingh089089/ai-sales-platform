package com.roslabs.aisales.businessservice.api;

import static org.assertj.core.api.Assertions.*;

import com.roslabs.aisales.businessservice.configuration.BusinessServiceProperties;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

class InternalTokenValidatorTest {
  private final InternalTokenValidator validator =
      new InternalTokenValidator(new BusinessServiceProperties("shared-secret"));

  @Test
  void acceptsValidToken() {
    assertThatCode(() -> validator.requireValid("shared-secret")).doesNotThrowAnyException();
  }

  @Test
  void rejectsMissingToken() {
    assertThatThrownBy(() -> validator.requireValid(null))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("401");
  }

  @Test
  void rejectsInvalidToken() {
    assertThatThrownBy(() -> validator.requireValid("wrong-secret"))
        .isInstanceOf(ResponseStatusException.class)
        .hasMessageContaining("401");
  }
}

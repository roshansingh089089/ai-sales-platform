package com.roslabs.aisales.businessservice.api;

import com.roslabs.aisales.businessservice.configuration.BusinessServiceProperties;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class InternalTokenValidator {
  private final byte[] expectedToken;

  public InternalTokenValidator(BusinessServiceProperties properties) {
    expectedToken = properties.internalToken().getBytes(StandardCharsets.UTF_8);
  }

  public void requireValid(String suppliedToken) {
    var supplied =
        suppliedToken == null
            ? new byte[0]
            : suppliedToken.getBytes(StandardCharsets.UTF_8);
    if (!MessageDigest.isEqual(expectedToken, supplied)) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal token");
    }
  }
}

package com.roslabs.aisales.businessservice.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.roslabs.aisales.businessservice.application.BusinessApplicationService;
import com.roslabs.aisales.businessservice.application.BusinessRepository;
import com.roslabs.aisales.businessservice.application.UpsertBusinessCommand;
import com.roslabs.aisales.businessservice.configuration.BusinessServiceProperties;
import com.roslabs.aisales.businessservice.domain.CanonicalBusiness;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class BusinessControllerAuthenticationTest {
  private AtomicInteger saveCount;
  private MockMvc mvc;

  @BeforeEach
  void setUp() {
    saveCount = new AtomicInteger();
    var service = new BusinessApplicationService(new StubBusinessRepository(saveCount));
    mvc =
        MockMvcBuilders.standaloneSetup(
                new BusinessController(
                    service,
                    new InternalTokenValidator(new BusinessServiceProperties("shared-secret"))))
            .build();
  }

  @Test
  void acceptsValidInternalToken() throws Exception {
    mvc.perform(
            post("/api/v1/businesses")
                .header("X-Internal-Token", "shared-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest()))
        .andExpect(status().isOk());
    org.assertj.core.api.Assertions.assertThat(saveCount.get()).isEqualTo(1);
  }

  @Test
  void rejectsMissingInternalToken() throws Exception {
    mvc.perform(
            post("/api/v1/businesses")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest()))
        .andExpect(status().isUnauthorized());
    org.assertj.core.api.Assertions.assertThat(saveCount.get()).isZero();
  }

  @Test
  void rejectsInvalidInternalToken() throws Exception {
    mvc.perform(
            post("/api/v1/businesses")
                .header("X-Internal-Token", "wrong-secret")
                .contentType(MediaType.APPLICATION_JSON)
                .content(validRequest()))
        .andExpect(status().isUnauthorized());
    org.assertj.core.api.Assertions.assertThat(saveCount.get()).isZero();
  }

  private String validRequest() {
    return """
        {
          "name": "Example Business",
          "source": "fake",
          "sourceRef": "example-1"
        }
        """;
  }

  private record StubBusinessRepository(AtomicInteger saveCount) implements BusinessRepository {
    @Override
    public CanonicalBusiness save(CanonicalBusiness business) {
      saveCount.incrementAndGet();
      return business;
    }

    @Override
    public Optional<CanonicalBusiness> findBySource(String source, String sourceRef) {
      return Optional.empty();
    }

    @Override
    public Optional<CanonicalBusiness> findDuplicate(UpsertBusinessCommand command) {
      return Optional.empty();
    }

    @Override
    public Optional<CanonicalBusiness> findById(UUID id) {
      return Optional.empty();
    }

    @Override
    public Page<CanonicalBusiness> search(String query, Pageable pageable) {
      return Page.empty(pageable);
    }
  }
}

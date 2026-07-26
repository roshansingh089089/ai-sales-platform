package com.roslabs.aisales;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.roslabs.aisales.leaddiscovery.api.LeadDiscoveryController;
import com.roslabs.aisales.leaddiscovery.application.*;
import com.roslabs.aisales.shared.api.ApiExceptionHandler;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;

class LeadDiscoveryControllerTest {
  private MockMvc mvc;

  @BeforeEach
  void setup() {
    var validator = new LocalValidatorFactoryBean();
    validator.afterPropertiesSet();
    mvc =
        MockMvcBuilders.standaloneSetup(new LeadDiscoveryController(new StubLeadDiscoveryService()))
            .setControllerAdvice(new ApiExceptionHandler())
            .setValidator(validator)
            .build();
  }

  @Test
  void searchesAndReturnsProviderNeutralLeads() throws Exception {
    mvc.perform(
            post("/api/v1/lead-discovery/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "category": "healthcare.dentist",
                      "location": "HSR Layout, Bangalore",
                      "radiusMeters": 5000,
                      "maximumResults": 10,
                      "phoneRequired": true,
                      "websiteFilter": "ANY"
                    }
                    """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[0].source").value("GEOAPIFY"))
        .andExpect(jsonPath("$[0].sourcePlaceId").value("place-1"))
        .andExpect(jsonPath("$[0].leadScore").value(100))
        .andExpect(jsonPath("$[0].qualification").value("HIGH"));
  }

  @Test
  void rejectsRequestsOverMaximumResultsLimit() throws Exception {
    mvc.perform(
            post("/api/v1/lead-discovery/search")
                .contentType(MediaType.APPLICATION_JSON)
                .content(
                    """
                    {
                      "category": "healthcare.dentist",
                      "location": "HSR Layout, Bangalore",
                      "radiusMeters": 5000,
                      "maximumResults": 101,
                      "phoneRequired": false,
                      "websiteFilter": "ANY"
                    }
                    """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  private static class StubLeadDiscoveryService extends LeadDiscoveryService {
    StubLeadDiscoveryService() {
      super(null, null);
    }

    @Override
    public List<LeadDiscoveryController.LeadResponse> search(
        LeadDiscoveryController.SearchRequest request) {
      return List.of(
          new LeadDiscoveryController.LeadResponse(
              "GEOAPIFY",
              "place-1",
              "Smile Studio",
              List.of("healthcare.dentist"),
              "HSR Layout",
              "08012345678",
              null,
              12.91,
              77.64,
              800,
              100,
              Qualification.HIGH,
              List.of("Matches requested category")));
    }
  }
}

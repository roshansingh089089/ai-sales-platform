package com.roslabs.aisales;

import static org.assertj.core.api.Assertions.assertThat;

import com.roslabs.aisales.leaddiscovery.configuration.LeadDiscoveryProperties;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.boot.env.YamlPropertySourceLoader;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.io.ClassPathResource;

class LeadDiscoveryPropertiesBindingTest {
  private final ApplicationContextRunner contextRunner =
      new ApplicationContextRunner()
          .withUserConfiguration(Config.class)
          .withPropertyValues(
              "app.lead-discovery.geoapify-api-key=test-key",
              "app.lead-discovery.maximum-results-per-search=20",
              "app.lead-discovery.connection-timeout=5s",
              "app.lead-discovery.read-timeout=5s",
              "app.lead-discovery.geoapify-details-enrichment-enabled=true",
              "app.lead-discovery.maximum-enrichment-requests-per-search=20");

  @Test
  void bindsKebabCaseGeoapifyApiKeyToRecordField() {
    contextRunner.run(
        context -> {
          var properties = context.getBean(LeadDiscoveryProperties.class);
          assertThat(properties.geoapifyApiKey()).isEqualTo("test-key");
          assertThat(properties.maximumResultsPerSearch()).isEqualTo(20);
          assertThat(properties.connectionTimeout()).hasSeconds(5);
          assertThat(properties.readTimeout()).hasSeconds(5);
          assertThat(properties.geoapifyDetailsEnrichmentEnabled()).isTrue();
          assertThat(properties.maximumEnrichmentRequestsPerSearch()).isEqualTo(20);
        });
  }

  @Test
  void applicationYamlResolvesGeoapifyApiKeyFromEnvironmentStyleProperty() throws Exception {
    var environment = new StandardEnvironment();
    environment.getSystemProperties().put("GEOAPIFY_API_KEY", "env-test-key");
    var loader = new YamlPropertySourceLoader();
    for (var source : loader.load("application", new ClassPathResource("application.yml"))) {
      environment.getPropertySources().addLast(source);
    }

    var properties =
        Binder.get(environment)
            .bind("app.lead-discovery", Bindable.of(LeadDiscoveryProperties.class))
            .orElseThrow(() -> new IllegalStateException("Lead discovery properties not bound"));

    assertThat(properties.geoapifyApiKey()).isEqualTo("env-test-key");
    assertThat(properties.maximumResultsPerSearch()).isEqualTo(100);
    assertThat(properties.geoapifyDetailsEnrichmentEnabled()).isTrue();
    assertThat(properties.maximumEnrichmentRequestsPerSearch()).isEqualTo(20);
  }

  @Configuration
  @EnableConfigurationProperties(LeadDiscoveryProperties.class)
  static class Config {}
}

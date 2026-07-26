package com.roslabs.aisales.businessservice.configuration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "business-service")
public record BusinessServiceProperties(String internalToken) {}

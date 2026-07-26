package com.roslabs.aisales.businessservice.configuration;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(BusinessServiceProperties.class)
public class BusinessServiceConfiguration {}

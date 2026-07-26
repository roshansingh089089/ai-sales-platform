package com.roslabs.aisales.businessintelligence.api;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/intelligence")
public class BusinessIntelligenceHealthController {
  @GetMapping("/health")
  Map<String, String> health() {
    return Map.of("status", "UP", "module", "business-intelligence");
  }
}

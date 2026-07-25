package com.roslabs.aisales.shared.api;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class HealthController {
  @GetMapping("/health")
  Map<String, String> health() {
    return Map.of("status", "UP", "application", "ai-sales-platform-backend");
  }
}

package com.roslabs.aisales.businessintelligence.api;

import com.roslabs.aisales.businessintelligence.application.EnrichmentProgressEvent;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/v1/intelligence")
public class EnrichmentProgressController {
  private final Map<String, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

  @GetMapping(path = "/businesses/{id}/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  SseEmitter events(@PathVariable String id) {
    var emitter = new SseEmitter(0L);
    emitters.computeIfAbsent(id, ignored -> new ArrayList<>()).add(emitter);
    emitter.onCompletion(() -> remove(id, emitter));
    emitter.onTimeout(() -> remove(id, emitter));
    return emitter;
  }

  @EventListener
  void onProgress(EnrichmentProgressEvent event) {
    var subscribers = emitters.getOrDefault(event.businessId(), List.of());
    for (var emitter : List.copyOf(subscribers)) {
      try {
        emitter.send(SseEmitter.event().name("progress").data(event));
      } catch (IOException e) {
        remove(event.businessId(), emitter);
      }
    }
  }

  private void remove(String id, SseEmitter emitter) {
    emitters.computeIfPresent(
        id,
        (ignored, list) -> {
          list.remove(emitter);
          return list.isEmpty() ? null : list;
        });
  }
}

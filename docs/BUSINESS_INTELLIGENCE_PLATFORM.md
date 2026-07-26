# Business Intelligence Platform Foundation

This module is the foundation for an event-driven AI Sales Platform. It is intentionally separate from the existing CRM workflows so discovery, enrichment, crawling, AI qualification, and future data providers can evolve without forcing a rewrite of contacts, opportunities, call briefs, or tasks.

## Architecture

Package:

```text
com.roslabs.aisales.businessintelligence
├── api
├── application
├── configuration
├── domain
└── infrastructure
```

Design rules:

- Domain documents are provider-neutral.
- Application services depend on ports/interfaces.
- Infrastructure adapters implement MongoDB persistence.
- Enrichment steps are plugin-style Spring components.
- Search persists canonical businesses and queues enrichment, but does not wait for enrichment.

## Mongo Documents

- `businesses_canonical` — canonical business record.
- `business_enrichment_status` — progress/status per business.
- `business_search_history` — immutable search execution records.
- `business_enrichment_jobs` — retryable background work.
- `business_snapshots` — point-in-time canonical business snapshots.

## Request Flow

```text
POST /api/v1/intelligence/businesses/search
  -> BusinessIntelligenceDiscoveryService
  -> LeadDiscoveryOrchestrator
  -> LeadDiscoveryProvider(s)
  -> CanonicalBusinessRepository
  -> EnrichmentJobRepository
  -> returns 202 Accepted immediately
```

The enrichment worker runs separately:

```text
EnrichmentScheduler
  -> EnrichmentWorker
  -> EnrichmentStep plugins
  -> EnrichmentStatus updates
  -> EnrichmentProgressEvent
  -> SSE clients
```

## Enrichment Plugins

Implemented framework-only steps:

- `WebsiteDiscoveryStep`
- `WebsiteCrawlerStep`
- `ContactExtractionStep`
- `SocialDiscoveryStep`
- `AIQualificationStep`

These steps intentionally do not crawl websites or call AI yet. Future implementations should update only missing fields and remain independently retryable.

## API Surface

- `POST /api/v1/intelligence/businesses/search`
- `GET /api/v1/intelligence/businesses`
- `GET /api/v1/intelligence/businesses/{id}`
- `GET /api/v1/intelligence/businesses/{id}/status`
- `GET /api/v1/intelligence/businesses/{id}/events`
- `GET /api/v1/intelligence/search-history`
- `GET /api/v1/intelligence/health`

## Configuration

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGODB_URI:mongodb://localhost:27017/aisales}

app:
  business-intelligence:
    worker-enabled: ${BI_WORKER_ENABLED:true}
    scheduler-enabled: ${BI_SCHEDULER_ENABLED:true}
    search-cache-ttl: ${BI_SEARCH_CACHE_TTL:5m}
    search-cache-max-entries: ${BI_SEARCH_CACHE_MAX_ENTRIES:250}
    worker-batch-size: ${BI_WORKER_BATCH_SIZE:10}
    max-attempts: ${BI_MAX_ATTEMPTS:3}
    worker-poll-delay: ${BI_WORKER_POLL_DELAY:30s}
```

## Future Work

- Replace in-memory search cache with Redis-backed cache.
- Add rate limiting and circuit breakers per provider.
- Add provider capability contracts for details, pagination, and batch enrichment.
- Implement website crawling and AI qualification as real step providers.
- Add Mongo integration tests with a supported Testcontainers Mongo module.

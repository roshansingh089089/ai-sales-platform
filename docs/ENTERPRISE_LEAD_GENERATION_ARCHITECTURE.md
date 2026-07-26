# Enterprise Lead Generation Platform Architecture

This document defines the long-term service architecture for evolving the product into an AI Sales Platform. The current repository also contains an earlier modular-monolith application; the service foundation below is additive and migration-safe.

## Target Repository Layout

```text
ai-sales-platform/
├── frontend/
├── backend/
│   ├── gateway-service/
│   ├── lead-service/
│   ├── business-service/
│   └── common-lib/
├── automation-service/
├── infra/
├── docker/
├── docs/
└── scripts/
```

## Request Flow

```text
Frontend
  -> Gateway Service
  -> Lead Service creates SearchJob
  -> Automation Service claims/runs job
  -> MapsLeads adapter exports CSV
  -> Lead Service imports normalized rows
  -> Business Service upserts canonical businesses
  -> Frontend queries job progress and businesses
```

## Architectural Boundaries

- Gateway Service: routing, CORS, edge policy, API aggregation later.
- Lead Service: search jobs, automation job lifecycle, CSV import orchestration, provider-neutral lead discovery contracts.
- Business Service: canonical business aggregate, persistence, query API, deduplication policy.
- Common Lib: result pattern, domain events, IDs, error abstractions, audit metadata.
- Automation Service: Playwright orchestration and provider adapters. MapsLeads is one adapter, not a domain concept.

## Non-Goals For This Foundation

- No website crawling.
- No AI calling.
- No contact scraping beyond CSV import framework.
- No browser interaction by users.
- No direct frontend dependency on MapsLeads.

## Provider Replacement Rule

The frontend and Java backend must never call MapsLeads-specific APIs. Provider-specific behavior belongs only in `automation-service/src/infrastructure/providers`.

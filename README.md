# AI Sales Platform

A local-first business-development workspace for Roshan: capture businesses and contacts, frame software opportunities, prepare deterministic call briefs, make human-controlled mobile calls, record outcomes, and manage follow-ups. No paid API, cloud account, AI key, or telephony provider is required.

## Phase 1 workflow

Create business → add contact/opportunity → generate local call brief → confirm and open `tel:` link → Roshan calls → record outcome → follow-up task is created.

The browser now supports this complete workflow through Business Details and Call Preparation. Applicable outcomes (`CALL_BACK_LATER`, `INTERESTED`, and `MEETING_REQUESTED`) default to follow-up and create a task. `DO_NOT_CONTACT` blocks future call preparation while preserving history.

The application never places, records, monitors, or transcribes calls. A `tel:` link only asks the operating system to open its configured handler; on a Mac, Roshan may simply read the number and dial it on his phone.

## Architecture and stack

- Modular monolith: Java 21, Spring Boot 3.5.4, Maven, Spring Web/Validation/Data JPA/Security/Actuator, Flyway, PostgreSQL
- Web: Next.js 16.2.11 App Router, React 19.2.8, TypeScript, Material UI 9.2.0, TanStack Query, Axios, React Hook Form, Zod
- Local infrastructure: PostgreSQL 17.5 and Redis 8.0.3 (reserved for later)

```text
backend/        Spring Boot application and Flyway migrations
frontend/       Next.js application
infrastructure/ Reserved infrastructure assets
docs/           Product, architecture, domain, workflow, and decisions
scripts/        Local automation
.github/        CI only; no deployment
```

## Prerequisites and setup

Java 21, Node.js 20+, npm, Docker Desktop, and `curl`.

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
docker compose up -d
cd backend && chmod +x mvnw && ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Health is available at http://localhost:8080/api/v1/health.

## Tests and formatting

```bash
cd backend && ./mvnw spotless:apply && ./mvnw test
cd frontend && npm run format && npm run lint && npm run build
docker compose config
```

## Troubleshooting

- Backend connection error: confirm PostgreSQL is healthy with `docker compose ps` and that `NEXT_PUBLIC_API_BASE_URL` ends in `/api/v1`.
- Port collision: change `DB_PORT`, `REDIS_PORT`, or `SERVER_PORT` in `.env`.
- A `tel:` link opens the wrong Mac app: change the OS handler or dial the displayed number manually.
- Maven is absent: `mvnw` downloads Maven 3.9.9 on first use.

## Current limitations and next milestone

This is a local single-user application. Authentication is deliberately absent and must be added before remote deployment. The next milestone is stronger automated UI coverage and richer search/reporting; external providers remain disabled until explicitly designed and approved.

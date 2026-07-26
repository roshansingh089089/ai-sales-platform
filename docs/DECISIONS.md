# Decisions

- Free, local-first, single-user internal development
- Manual calling through `tel:` links; no physical SIM automation or paid provider
- Deterministic local call-brief generator; no paid APIs
- Modular monolith with Java/Spring Boot and PostgreSQL
- Next.js web client
- Redis reserved for later and not required by the workflow
- No microservices
- Focused dashboard and recent-call projections are served by small read endpoints rather than a reporting framework
- All persisted timestamps remain UTC; the browser renders the user's local timezone

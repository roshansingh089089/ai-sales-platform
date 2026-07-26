# Architecture

The system is a Java 21/Spring Boot modular monolith backed by PostgreSQL, plus a Next.js App Router client. Modules follow API, application, domain, and infrastructure boundaries. Controllers use DTOs, application services own transactions, and repositories remain infrastructure concerns.

`CallBriefGenerator` is provider-neutral; `LocalTemplateCallBriefGenerator` is the only implementation. Redis is available in Compose but is not an application dependency.

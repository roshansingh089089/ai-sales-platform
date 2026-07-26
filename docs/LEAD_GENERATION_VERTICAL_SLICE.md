# Lead generation vertical slice

This slice uses a deterministic fake automation provider. It does not implement the real MapsLeads browser workflow.

## Runtime services

- Gateway Service routes `/api/v1/lead-searches/**` to Lead Service.
- Lead Service owns search jobs, idempotency, progress, CSV import, and lead search results.
- Automation Service receives internal job dispatches and runs `AUTOMATION_PROVIDER=fake` by default.
- Business Service owns canonical businesses and dedupes by provider/source id, website domain, phone, then name + address.

## Environment

```bash
AUTOMATION_SERVICE_URL=http://localhost:8090
BUSINESS_SERVICE_URL=http://localhost:8082
LEAD_SERVICE_URL=http://localhost:8081
INTERNAL_AUTOMATION_TOKEN=local-dev-token
INTERNAL_SERVICE_TOKEN=local-dev-token
AUTOMATION_PROVIDER=fake
AUTOMATION_PORT=8090
```

No MapsLeads credentials or API keys are required for this fake-provider slice.

## CSV contract

The import endpoint accepts provider-neutral CSV files with these headers:

```text
business_name,category,address,city,state,country,postal_code,phone,email,website,rating,review_count,latitude,longitude,source_external_id,source_url
```

`business_name` is required. Optional fields are used as canonical-business enrichment signals when present.

## Curl smoke test

Create a search through the Gateway:

```bash
curl -i -X POST http://localhost:8080/api/v1/lead-searches \
  -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: demo-dentists-001' \
  -d '{"query":"dentists","location":"HSR Layout, Bengaluru","maximumResults":20}'
```

Check status:

```bash
curl http://localhost:8080/api/v1/lead-searches/{searchId}/status
```

List results:

```bash
curl 'http://localhost:8080/api/v1/lead-searches/{searchId}/results?page=0&size=20'
```

List history:

```bash
curl 'http://localhost:8080/api/v1/lead-searches?page=0&size=10'
```

Automation internal dispatch endpoint, used by Lead Service:

```bash
curl -i -X POST http://localhost:8090/internal/jobs \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Token: local-dev-token' \
  -d '{"id":"00000000-0000-0000-0000-000000000001","query":"dentists","location":"HSR Layout, Bengaluru","maxResults":20}'
```

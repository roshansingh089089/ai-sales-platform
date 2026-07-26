# Phase 0 local foundation

## PostgreSQL initialization

The root `docker-compose.yml` initializes two independent databases:

- `${LEAD_DB_NAME:-aisales_leads}`
- `${BUSINESS_DB_NAME:-aisales_businesses}`

The PostgreSQL image runs `docker/postgres/init-multiple-databases.sh` only when
its data directory is initialized for the first time. The script is idempotent,
so it is also safe to execute manually against an existing container.

An existing `postgres_data` volume is not reinitialized automatically. Preserve
its data and run the script manually, or deliberately remove the volume when a
clean local start is required. Removing the volume deletes all local PostgreSQL
data.

Lead Service and Business Service retain separate Flyway histories and run their
own migrations at startup.

## Internal HTTP contract

Internal requests use `X-Internal-Token`.

- Lead Service validates Automation Service callbacks with
  `INTERNAL_AUTOMATION_TOKEN`.
- Automation Service sends that same token to Lead Service.
- Lead Service sends `INTERNAL_SERVICE_TOKEN` to Business Service.
- Business Service validates `INTERNAL_SERVICE_TOKEN` on `POST
  /api/v1/businesses`.

Public Business Service reads remain unauthenticated in Phase 0.

## Automation retry attempts

Each persisted `AutomationJob` represents one immutable attempt. A retry creates
a new attempt with a new ID, an incremented `attemptNumber`, and
`retryOfAutomationJobId` lineage. `retryRequestKey` makes repeated retry requests
idempotent. Failed attempts and their transition histories are not modified or
resumed.

Detailed Automation Service stages are mapped explicitly to the smaller public
Lead Service status model. Unknown future automation stages are ignored at this
boundary.

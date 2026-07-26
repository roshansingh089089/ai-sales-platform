# Automation Engine architecture

This phase implements the automation infrastructure only. It does not implement MapsLeads selectors, scraping, website crawling, AI, CRM, email, or provider-specific browser workflows.

## Components

```text
Automation API
  ↓
AutomationJobManager
  ↓
WorkflowEngine
  ↓
ProviderManager
  ↓
BrowserPool
  ↓
SessionManager
  ↓
DownloadManager
  ↓
RecoveryManager
  ↓
Logging / Metrics / Health
  ↓
LeadAutomationProvider
    ├─ FakeLeadProvider
    └─ MapsLeadsProvider diagnostics
```

## Sequence

```text
Lead Service
  POST /internal/jobs
      ↓
Automation API validates internal token
      ↓
AutomationJobManager creates or returns persistent AutomationJob
      ↓
WorkflowEngine runs asynchronously
      ↓
BrowserPool leases reusable browser session placeholder
      ↓
SessionManager restores provider session metadata
      ↓
ProviderManager resolves configured provider
      ↓
Provider emits CSV artifact
      ↓
DownloadManager archives artifact and computes checksum
      ↓
LeadServiceClient uploads CSV to Lead Service import endpoint
      ↓
AutomationJob completes with persisted transition history
```

## Workflow states

```text
CREATED
  ↓
BROWSER_STARTING
  ↓
SESSION_LOADING
  ↓
PROVIDER_INITIALIZING
  ↓
SEARCH_EXECUTING
  ↓
EXPORTING
  ↓
WAITING_FOR_DOWNLOAD
  ↓
UPLOADING_RESULTS
  ↓
COMPLETED
```

Failure states:

```text
Any active step → FAILED
Any active step → MANUAL_ACTION_REQUIRED
MANUAL_ACTION_REQUIRED → SESSION_LOADING
```

The domain aggregate validates legal transitions and persists every transition.

## Browser lifecycle

The `BrowserPool` abstraction owns browser capacity and reuse. It currently creates logical leases only; it does not launch Chromium or open pages. Future browser-backed providers should acquire a lease from the pool instead of launching a new browser per job.

Responsibilities:

- maximum browser instances
- browser reuse
- idle timeout pruning
- graceful shutdown
- reuse metrics

## Browser Automation Runtime

The Browser Automation Runtime hosts Chromium and exposes provider-neutral extension inspection without implementing provider search or lead extraction logic.

Components:

```text
BrowserRuntime
  ├─ BrowserProfile
  ├─ ExtensionLoader
  ├─ ExtensionRegistry
  ├─ TabManager
  ├─ WindowManager
  ├─ DownloadListener
  ├─ ScreenshotService
  ├─ DomInspector
  └─ BrowserHealthChecker
```

Responsibilities:

- launch persistent Chromium
- reuse or close the browser context
- restart cleanly
- load configured extension paths
- verify extension service worker/background page detection
- record extension metadata without hardcoded IDs
- derive unpacked extension IDs from `manifest.key` and verify the declared popup/options page
- use service-worker/background discovery only when a manifest key is unavailable
- open extension UI when manifest popup/options page or `AUTOMATION_EXTENSION_UI_PATH` is available
- capture screenshots
- inspect DOM
- attach download listeners
- report health

The runtime intentionally does not:

- perform MapsLeads search
- implement selectors for business fields
- scrape websites
- export leads
- import CSV

## MapsLeads feasibility diagnostics

`MapsLeadsProvider` is registered as a diagnostic-only provider. Its lead execution method fails closed until search automation is deliberately implemented. Diagnostics are executed through `ProviderManager` and `WorkflowEngine`, which reuse the shared browser lease and provider session lifecycle. Chromium is launched only by `BrowserRuntime`.

```bash
curl -X POST http://localhost:8090/internal/providers/mapsleads/diagnostics \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Token: local-dev-token' \
  -d '{"uiPreference":"auto","developmentMode":true}'
```

Supported UI preferences are `auto`, `popup`, `options`, and `direct`. A direct request must also provide a `directUrl` belonging to the discovered extension ID.

The provider report contains:

- localized manifest name, raw name, default locale, version, popup, options, background, and service-worker metadata
- runtime background and service-worker URLs
- browser version, user agent, viewport, and health
- full HTML and accessibility snapshots
- full-page and optional development-mode step screenshots
- interactive controls and role/name/label/placeholder/text locator candidates
- export-control discovery without clicking the control
- popup state (`BING_MAPS_LAUNCHER_READY`, `LOADING`, `LOADING_TIMEOUT`, `LOGIN_REQUIRED`, `UNSUPPORTED_UI`, or `FAILED`) derived only from visible UI evidence
- sanitized DOM, accessibility, and control-inventory artifacts with sensitive values and account identifiers redacted
- the persisted JSON report path

Diagnostic artifacts are written beneath `AUTOMATION_DIAGNOSTIC_DIR`. No form is submitted, no search is started, no export control is clicked, and no CSV is parsed or uploaded.

### MapsLeads launcher dry run

The verified popup is a launcher surface. The guarded launcher endpoint waits up to 30 seconds for loading indicators to disappear, identifies `Open Bing Maps` separately from `Watch Tutorial`, records stable locator evidence, and never activates either control.

```bash
curl -X POST http://localhost:8090/internal/providers/mapsleads/launcher-dry-run \
  -H 'Content-Type: application/json' \
  -H 'X-Internal-Token: local-dev-token' \
  -d '{"activate":false}'
```

`activate` defaults to `false`. A request with `activate=true` is rejected with HTTP `501` and code `NOT_IMPLEMENTED` before browser interaction.

The older popup form dry-run endpoint remains guarded for compatibility. On the verified launcher UI it returns `LAUNCH_REQUIRED`; it no longer expects or fills query/location controls in `popup.html`.

Before Chromium starts, runtime status reports configured extensions with `loadStatus=CONFIGURED`. After startup verification, the same registry entries become `LOADED` or `FAILED`.

### Runtime diagnostics

```bash
curl -X POST http://localhost:8090/internal/browser-runtime/diagnostics \
  -H 'X-Internal-Token: local-dev-token'
```

The diagnostic:

1. Starts persistent Chromium.
2. Loads configured extensions.
3. Verifies extension metadata.
4. Opens extension UI if supported.
5. Captures a screenshot.
6. Dumps/inspects DOM.
7. Confirms download listener status.
8. Closes the browser.

Runtime status:

```bash
curl http://localhost:8090/internal/browser-runtime/status \
  -H 'X-Internal-Token: local-dev-token'
```

## Provider lifecycle

Providers implement `LeadAutomationProvider`:

```text
name()
run(searchJob, progressReporter)
```

The engine does not know provider-specific selectors, URLs, extension details, or scraping logic.

Current providers:

- `FakeLeadProvider`: deterministic provider used by the completed vertical slice.
- `MapsLeadsProvider`: diagnostic-only extension integration; browser lifecycle remains in `BrowserRuntime`.

Future providers can be registered in `ProviderManager` without changing the workflow engine.

## Session lifecycle

`SessionManager` owns provider session metadata and profile directories:

- profile path
- restored/new session detection
- health marker
- invalid-session marker

Authentication is intentionally not hardcoded.

## Download lifecycle

`DownloadManager` owns:

- staging directory
- archive directory
- filename sanitization
- checksum calculation
- row-count metadata
- download success/failure counters

## Recovery

`RecoveryManager` classifies known failures:

- browser crash
- download timeout
- provider timeout
- session expired
- generic automation error

Recoverable errors use bounded exponential backoff. Session/authentication failures route to manual intervention.

## Observability

Each automation log entry includes:

- automationJobId
- searchJobId
- provider
- currentStep
- correlationId

Directories are prepared for:

- logs
- screenshots
- HAR files

Metrics currently expose in-memory counters and are structured for a future Micrometer/Prometheus adapter.

## Health

`GET /internal/health` returns:

- browser pool status
- provider availability
- download directory status
- session manager status
- workflow engine status
- observability directories
- metrics snapshot

## Configuration

```bash
AUTOMATION_PORT=8090
INTERNAL_AUTOMATION_TOKEN=local-dev-token
LEAD_SERVICE_URL=http://localhost:8081
AUTOMATION_PROVIDER=fake
AUTOMATION_BROWSER_POOL_SIZE=2
AUTOMATION_BROWSER_IDLE_TIMEOUT_MS=300000
AUTOMATION_DOWNLOAD_DIR=.automation/downloads
AUTOMATION_ARCHIVE_DIR=.automation/archive
AUTOMATION_SESSION_DIR=.automation/sessions
AUTOMATION_SCREENSHOT_DIR=.automation/screenshots
AUTOMATION_HAR_DIR=.automation/har
AUTOMATION_JOB_STORE_PATH=.automation/jobs.json
AUTOMATION_RETRY_COUNT=2
AUTOMATION_RETRY_DELAY_MS=500
AUTOMATION_BROWSER_HEADLESS=false
AUTOMATION_BROWSER_PROFILE_DIR=.automation/sessions/browser-runtime
AUTOMATION_EXTENSION_PATHS=/absolute/path/to/extension
AUTOMATION_EXTENSION_UI_PATH=popup.html
AUTOMATION_DIAGNOSTIC_DIR=.automation/diagnostics
```

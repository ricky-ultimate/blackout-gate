# Blackout Gate

Blackout Gate is a deployment gating system that blocks or warns CI pipelines during configured blackout windows. It consists of a Rust gate binary that runs inside GitHub Actions, a Node.js API that stores audit logs and issues override tokens, and a Next.js dashboard for visibility and key management.

---

## Architecture

```
.blackout/blackout.yaml     Window configuration
gate/                       Rust binary — runs in CI, evaluates windows, calls API
api/                        Fastify API — audit log, overrides, config, key management
dashboard/                  Next.js dashboard — audit log, calendar, settings
```

The gate binary is the only component that runs in the critical path. The API and dashboard are supporting infrastructure.

---

## Prerequisites

- Docker and Docker Compose
- Node.js 22
- Rust 1.94 (for local gate development only)

---

## Local Development

Copy the example environment file and fill in values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `POSTGRES_PASSWORD` | Postgres password, used by Docker Compose |
| `ADMIN_SECRET` | Secret for bootstrapping orgs and issuing keys |
| `API_URL` | API base URL, defaults to `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | API base URL used by the dashboard |

Start the API (starts Postgres, runs migrations, seeds an org):

```bash
# Linux/macOS
./dev.sh

# Windows
./dev.ps1
```

The seed script will print an API key. Add it to your `.env` as `BLACKOUT_API_KEY`.

Start the dashboard in a separate terminal:

```bash
cd dashboard && npm run dev
```

Dashboard runs on `http://localhost:3001`. Sign in with the API key from the seed output.

---

## Docker Compose

To run the full API stack via Docker Compose:

```bash
docker compose up --build
```

`POSTGRES_PASSWORD` and `ADMIN_SECRET` must be set in your environment or a `.env` file at the repo root before running.

Bootstrap your first org after the API is up:

```bash
curl -X POST http://localhost:3000/admin/bootstrap \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"org_name": "Acme Corp", "org_slug": "acme-corp", "api_key_label": "production"}'
```

Store the returned `api_key` securely. It will not be shown again.

---

## Blackout Configuration

Windows are defined in `.blackout/blackout.yaml`. The gate binary reads this file at runtime.

```yaml
version: "1.0"
org: your-org-slug
timezone: "America/New_York"

defaults:
  verdict_on_match: block
  allow_override: false
  override_approvers: []
  notify:
    slack: []
    pr_comment: true

windows:
  - id: q1-freeze
    name: "Q1 Quarter-End Change Freeze"
    recurrence:
      type: range
      start: "2026-03-28T00:00:00"
      end: "2026-03-31T23:59:59"
    verdict: block
    reason: "SOX-mandated change freeze."
    allow_override: true
    override_approvers:
      - github: jsmith
    notify:
      slack:
        - channel: "#deployments"
      pr_comment: true

  - id: icu-shift-change
    name: "ICU Shift Change Window"
    recurrence:
      type: cron
      expressions:
        - "0 6 * * *"
        - "0 14 * * *"
        - "0 22 * * *"
      duration_minutes: 60
    verdict: block
    reason: "No deployments during nursing shift transitions."
    allow_override: false
    notify:
      slack:
        - channel: "#platform-eng"
      pr_comment: true

environments:
  production:
    applies_to: ["main", "release/*"]
    windows: ["q1-freeze", "icu-shift-change"]
  staging:
    applies_to: ["staging", "develop"]
    windows: []
  development:
    applies_to: ["feature/*", "fix/*"]
    windows: []
```

### Recurrence types

**Range** — a fixed start and end datetime. Datetimes are parsed as RFC 3339. If no timezone offset is included they are treated as UTC.

**Cron** — one or more cron expressions with a `duration_minutes` field. The gate checks whether the current time falls within `[last_tick, last_tick + duration_minutes]` for any expression.

### Verdicts

| Verdict | Behavior |
|---|---|
| `block` | Fails the CI step with exit code 1 |
| `warn` | Posts a warning comment and passes the CI step |

### PagerDuty sync

Windows can be sourced from PagerDuty maintenance windows:

```yaml
- id: pagerduty-sync
  name: "PagerDuty Maintenance Windows"
  source:
    type: pagerduty
    service_ids:
      - "PXXXXXX"
  verdict: block
  reason: "Active PagerDuty maintenance window."
  allow_override: false
  notify:
    slack:
      - channel: "#deployments"
    pr_comment: true
```

Pass `pagerduty-api-key` in the GitHub Actions step to enable this.

---

## GitHub Actions Integration

Add the following to your workflow:

```yaml
- name: Run Blackout Gate
  uses: your-org/blackout-gate-action@v1
  with:
    config: ".blackout/blackout.yaml"
    environment: "production"
    api-url: ${{ secrets.BLACKOUT_API_URL }}
    api-key: ${{ secrets.BLACKOUT_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    slack-webhook: ${{ secrets.SLACK_WEBHOOK_URL }}
    pagerduty-api-key: ${{ secrets.PAGERDUTY_API_KEY }}
    override-token: ${{ secrets.BLACKOUT_OVERRIDE_TOKEN }}
```

Required secrets:

| Secret | Description |
|---|---|
| `BLACKOUT_API_URL` | Base URL of your deployed API |
| `BLACKOUT_API_KEY` | Org API key issued at bootstrap |
| `GITHUB_TOKEN` | Provided automatically by GitHub Actions |

Optional secrets:

| Secret | Description |
|---|---|
| `SLACK_WEBHOOK_URL` | Incoming webhook for Slack notifications |
| `PAGERDUTY_API_KEY` | PagerDuty API key for maintenance window sync |
| `BLACKOUT_OVERRIDE_TOKEN` | Single-use token to bypass an active block |

The workflow in `.github/workflows/blackout-gate.yml` runs on pushes to `main` and `release/**` and on pull requests targeting those branches.

---

## Override Tokens

When a window has `allow_override: true`, an approver listed in `override_approvers` can issue a single-use token from the dashboard under Overrides, or via the API:

```bash
curl -X POST https://your-api/v1/overrides/issue \
  -H "Authorization: Bearer $BLACKOUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"window_id": "q1-freeze", "approved_by": "jsmith", "expires_in_minutes": 60}'
```

Set the returned token as the `BLACKOUT_OVERRIDE_TOKEN` secret on the repository or pass it as a one-time secret override. The token is consumed on first use.

---

## API Reference

All routes except `/health` and `/admin/*` require a `Bearer` token in the `Authorization` header.

### Audit

```
GET /v1/audit
```

Query parameters: `repo`, `environment`, `outcome`, `limit` (max 200), `offset`.

### Evaluate

```
POST /v1/evaluate
```

Records a deployment event. Called automatically by the gate binary.

```json
{
  "repo": "acme-corp/backend",
  "environment": "production",
  "branch": "main",
  "triggered_by": "jsmith",
  "outcome": "blocked",
  "window_id": "q1-freeze",
  "window_name": "Q1 Quarter-End Change Freeze",
  "reason": "SOX-mandated change freeze."
}
```

### Overrides

```
POST /v1/overrides/issue
POST /v1/overrides/validate
```

### Config

```
POST /v1/config/upload     Upload blackout.yaml content
GET  /v1/config/windows    List parsed windows
```

### Keys

```
GET    /v1/keys            List API keys for the authenticated org
DELETE /v1/keys/:key_id    Revoke a key
```

### Admin

Admin routes require the `ADMIN_SECRET` in the `Authorization` header.

```
POST /admin/bootstrap      Create an org and issue an initial API key
POST /admin/keys           Issue an additional API key for an org
```

---

## Dashboard

The dashboard is available at `http://localhost:3001` in development and connects to the API via `NEXT_PUBLIC_API_URL`.

Sign in with any valid org API key. The dashboard provides:

- **Audit** — filterable log of all deployment events
- **Windows** — calendar view of configured range windows
- **Overrides** — issue single-use override tokens
- **Settings** — upload blackout.yaml, manage and revoke API keys

---

## Project Structure

```
.blackout/
  blackout.yaml             Example configuration
.github/
  workflows/
    blackout-gate.yml       Example workflow
api/
  src/
    db/                     Postgres client and migrations
    lib/                    Token utilities
    plugins/                Fastify auth plugin
    routes/                 API route handlers
  scripts/
    seed.ts                 Bootstrap script for local development
  Dockerfile
dashboard/
  src/
    app/                    Next.js app router pages
    components/             UI components
    hooks/                  React Query hooks
    lib/                    API client and auth utilities
gate/
  src/
    audit.rs                Audit log recording
    config.rs               YAML config parsing
    engine.rs               Window evaluation logic
    github.rs               GitHub status and PR comment posting
    main.rs                 Entry point
    override_token.rs       Override token validation
    pagerduty.rs            PagerDuty maintenance window sync
    slack.rs                Slack notifications
  Dockerfile
docker-compose.yml
```

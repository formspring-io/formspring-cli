# Changelog

## Unreleased

### Changed

- Synced `schema/` with the current API: 576 REST operations (was 80), 830 agent tools (was 74), and a new
  `schema/import-contract.json` describing the response import steps, limits and checksum.
- `schema/routes.json` now keeps only the public route table (domain, method, uri, name). `npm run sync-schema`
  applies this automatically.
- API errors print the `request_id` and handle the typed error envelope, including hints for idempotency conflicts and
  retryable errors.
- `--json` prints `null` (valid JSON) instead of the text `undefined` when a call returns no body.
- `forms submissions download-file` streams to disk with `--output` (required for binary files) and no longer prints
  binary data as text.

### Added

- Named commands for the CRM (`contacts`, `companies`, `deals`, `tasks`, `pipelines`, `lifecycle-stages`,
  `contact-fields`, `contact-lists`, `contact-tags`, `contact-views`, `crm`), links (`links ...`, `links imports`,
  `links stats outcomes`, `links destinations`), reports (`forms attribution`, `funnels attribution`,
  `funnels analytics`, `bookings ...`), automations (`forms|funnels|surveys automations` with runs and versions,
  `automation-limits`), the feedback hub digest schedule, data tables, documents and signing, and the migration
  commands that were documented but missing (`forms imports`, `migrations`, `sandbox`, `tokens audit`,
  `forms webhooks`). 261 commands are written from `schema/openapi.json` by `npm run scaffold-resources`; the list is
  saved in `schema/cli-commands.json` and shown by `formspring commands --json`.
- `--all` on cursor lists (and `api request GET ... --all`) to return every page in one result.
- `--idempotency-key` on every write that accepts an `Idempotency-Key` header, and on `api request`.
- `--output` / `--force` for file downloads, streamed to disk; `api request GET ... --output`.
- `api request --param name=value` to fill any path parameter.
- `links import --file links.csv [--check-only] [--wait]`, `contacts import --file contacts.csv`, and
  `contacts export --output contacts.csv` (queue, wait, download).
- Tests for the HTTP layer, the generated commands (checked against `schema/openapi.json`) and end-to-end runs against a
  local stub API. CI now also fails when the generated commands drift from the schema.

### Notes

- No version bump and no publish: the package stays private until release.

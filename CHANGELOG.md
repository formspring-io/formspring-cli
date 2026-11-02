# Changelog

## Unreleased

### Changed

- Synced `schema/` with the current API: 677 REST operations (was 80), 860 agent tools (was 74), and a new
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
  `forms webhooks`). 282 commands are written from `schema/openapi.json` by `npm run scaffold-resources`; the list is
  saved in `schema/cli-commands.json` and shown by `formspring commands --json`.
- `--all` on cursor lists (and `api request GET ... --all`) to return every page in one result.
- `--idempotency-key` on every write that accepts an `Idempotency-Key` header, and on `api request`.
- `--output` / `--force` for file downloads, streamed to disk; `api request GET ... --output`.
- `api request --param name=value` to fill any path parameter.
- `links import --file links.csv [--check-only] [--wait]`, `contacts import --file contacts.csv`, and
  `contacts export --output contacts.csv` (queue, wait, download).
- Tests for the HTTP layer, the generated commands (checked against `schema/openapi.json`) and end-to-end runs against a
  local stub API. CI now also fails when the generated commands drift from the schema.

- The CRM data model (`/api/v1/crm/*`, 105 operations) is fully covered by named commands: `crm objects`,
  `crm fields`, `crm relations`, `crm views`, `crm records` (with `notes`, `tasks`, `batch`, `upsert`, `bulk`, `timeline`),
  `crm trash`, `crm favorites`, `crm import`, `crm export`, `crm files`, `crm duplicates`, `crm merge`, `crm layout`,
  `crm permissions`, `crm schema`, `crm dashboards` (with `widgets`), `crm automations`, `crm calendar`,
  `crm field-types` and `crm run-automation`.
  - `crm records list`: `--filter field:operator:value` (repeatable, or a JSON tree / `@file`), `--filter-any`,
    `--sort`, `--group-by`, `--aggregate`, `--view`, `--fields`, `--include`, `--limit` and `--all`.
  - `--set field=value` / `field:=JSON` on `crm records create|update|upsert|bulk`; `--options` on `crm fields create|options`;
    flag shortcuts for objects, fields, relations, views, merges, favorites, notes and tasks (every command still takes `--data`).
  - `crm import start|map|dry-run|run|rollback|status|errors` with `--wait`; `crm export create --wait --output file.csv`;
    `crm export download`, `crm files upload|download` (signed links are fetched without the token).
  - `crm schema export|plan|apply|status` with file in/out, `--prune`, `--allow-destructive`, `--check`, `--async` and `--wait`.
  - `crm objects deactivate|activate`.
- `schema/cli-commands.json` marks commands that stand in for a generated one with `hand_written: true`;
  `npm run scaffold-resources` keeps those files and still lists the route they cover. `ResourceCommand` gained hooks
  (`queryFromFlags`, `bodyFromFlags`, `transformResult`, `bodyFlags`) so a stand-in only adds what differs.
- `DELETE` operations that take a JSON body (`crm records batch delete`, `crm trash erase`) now get `--data` / `--stdin`.

### Notes

- No version bump and no publish: the package stays private until release.

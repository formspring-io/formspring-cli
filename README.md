# Formspring CLI

Agent-friendly command-line interface for the [Formspring](https://formspring.io) REST API (`/api/v1`) and MCP-only tools.

## Install (local)

```bash
git clone git@github.com:formspring-io/formspring-cli.git
cd formspring-cli
npm install
npm run build
npm link
```

## Authenticate

```bash
formspring auth login --base-url https://formspring.io
# or a local instance: formspring auth login --base-url http://localhost:8000
formspring auth whoami --json
```

Tokens are stored in `~/.config/formspring/config.json`. Override with `FORMSPRING_TOKEN` and `FORMSPRING_BASE_URL`.

## Usage

```bash
# Named commands
formspring forms list --json
formspring me get --json
formspring billing plan --json

# Full API coverage (any method/path)
formspring api request GET /forms
formspring api request POST /forms --data @form.json
formspring api request GET /forms/{form}/automations --form frm_abc

# MCP-only tools
formspring templates list --product form
formspring forms stats get --form frm_abc
formspring mcp invoke list_templates --data '{"product":"form"}'

# Agent discovery
formspring commands --json
```

Global flags: `--json`, `--base-url`, `--token`, `--profile`, `--verbose`, `--yes`, `--dry-run`.

## Named commands for every resource group

Most REST operations have a named command, written from the API description (`npm run scaffold-resources`). Path
parameters are flags (`--contact`, `--form`, ...), list filters are flags, and `--help` shows all of them.

| Area | Commands |
|------|----------|
| CRM | `contacts`, `companies`, `deals`, `tasks`, `pipelines`, `lifecycle-stages`, `contact-fields`, `contact-lists`, `contact-tags`, `contact-views`, `crm` |
| Links | `links list`, `links create`, `links update`, `links destinations`, `links stats outcomes`, `links imports`, `links import` |
| Reports | `forms attribution`, `funnels attribution`, `funnels analytics`, `bookings pages analytics` |
| Automations | `forms automations`, `funnels automations`, `surveys automations` (each with `runs`, `versions`, `run`, `enable`, `disable`), `automation-limits get`, `automation-limits update` |
| Feedback hub | `feedback-hub digest get`, `feedback-hub digest update`, `feedback-hub digest test`, `feedback-hub helpdesk-sources` |
| Data | `data-tables`, `data-tables rows` |
| Documents and signing | `forms submissions documents`, `forms submissions signing` (send, remind, void, verify, evidence, signed-document) |
| Migrations | `forms imports`, `migrations`, `sandbox`, `tokens audit` |

Anything without a named command is still reachable with `formspring api request`.

### Lists, pages and `--all`

List commands that support cursors take `--cursor`, `--per-page` and `--all`. With `--all` the CLI follows
`meta.next_cursor` and prints every item in one `{ "data": [...], "meta": { "total", "pages", "truncated" } }` result.
`--max-pages` (default 100) caps the walk.

```bash
formspring contacts list --lifecycle-stage lead --all --json
formspring api request GET /contacts --all --json
```

### Safe retries with idempotency keys

Every write that accepts an `Idempotency-Key` has an `--idempotency-key` flag. Repeating the key with the same payload
returns the first result instead of writing again (kept for 7 days); a different payload with the same key fails with
`idempotency_key_reused`.

```bash
formspring contacts create --data @contact.json --idempotency-key crm-sync-0042 --json
```

### Downloads

Commands that return a file stream it to disk without loading it into memory. Binary files (PDF, ZIP) need `--output`;
CSV defaults to stdout. An existing file is kept unless you pass `--force`.

```bash
formspring forms submissions documents download --form frm_abc --submission sub_1 --document doc_1 --output contract.pdf
formspring forms submissions signing evidence --form frm_abc --submission sub_1 --envelope env_1 --output evidence.zip
formspring api request GET /contacts/exports/{contactExport}/download --param contactExport=ID --output contacts.csv
```

### Importing and exporting

```bash
# Links: check every row without creating anything, then import for real
formspring links import --file links.csv --check-only --wait --json
formspring links import --file links.csv --import-key spring-launch --wait --json

# Contacts: upload, map, check, run (an import never implies marketing consent, so run needs "attest": true)
formspring contacts import --file contacts.csv --json
formspring contacts imports update --contact-import IMPORT_ID --data @mapping.json
formspring contacts imports dry-run --contact-import IMPORT_ID --json
formspring contacts imports run --contact-import IMPORT_ID --data '{"attest":true}' --json

# Contacts: export to a CSV file (queues, waits, downloads)
formspring contacts export --output contacts.csv --filters '{"lifecycle_stage":"lead"}'
```

### Errors

Failures exit with status 1 and print to stderr. API errors show the message, a hint for the usual fixes (401 sign in,
402 plan, 403 token ability, 409 idempotency conflicts) and the `request_id` to quote to support. `--json` keeps stdout
clean for scripts.

## Schema sync (developers)

With a checkout of the Formspring app next to this repository (or `FORMSPRING_APP_PATH` set):

```bash
npm run sync-schema          # export the manifest into schema/ and keep only public route data
npm run scaffold-commands    # commands for the core forms and billing routes
npm run scaffold-resources   # named commands for the resource groups, from schema/openapi.json
npm run build
npm run check:parity
```

`schema/cli-commands.json` lists the commands written by `scaffold-resources`. Files carrying the "Generated by
scaffold-resource-commands" header are rewritten on every run; hand-written commands are never touched.

Or download production OpenAPI only:

```bash
npm run sync-schema -- --from-url
```

## Docs

- REST API: https://formspring.io/docs/api/overview
- MCP: https://formspring.io/docs/mcp/overview

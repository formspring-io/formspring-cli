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
formspring auth login
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
| CRM data model | `crm objects`, `crm fields`, `crm relations`, `crm views`, `crm records` (with `notes`, `tasks`, `batch`), `crm trash`, `crm favorites`, `crm import`, `crm export`, `crm files`, `crm duplicates`, `crm merge`, `crm layout`, `crm permissions`, `crm schema`, `crm dashboards` (with `widgets`), `crm run-automation` |
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

### The CRM data model: objects, fields, records

Contacts, companies, deals, tasks and your own objects (projects, properties, invoices) share one set of commands under
`crm`. Objects, fields and views are addressed by key, records by id. Needs the `crm:read` / `crm:write` token abilities
(custom objects need the Team plan). Every operation of `/api/v1/crm/*` has a named command; `formspring crm --help`
lists them, and each command's `--help` shows its flags.

```bash
# Model: objects, fields (select options inline), relations, saved views
formspring crm objects create --label-singular Project --label-plural Projects --json
formspring crm fields create --object projects --label Status --type select --options Planned,Active,Done --json
formspring crm fields create --object projects --label Code --type text --unique --json
formspring crm relations create --object clients --target projects --kind one_to_many \
  --source-label Projects --target-label Client --json
formspring crm views create --object projects --name "Active, biggest first" \
  --filter status:is:active --sort=-budget --columns name,budget,status --json
formspring crm objects deactivate --object projects      # switch off, keep the data (crm objects activate to undo)

# Records: --set field=value, or field:=JSON for numbers, booleans, null and lists
formspring crm records create --object projects --set name="Relaunch" --set budget:=12000 --idempotency-key p-1 --json
formspring crm records update --object projects --record REC_ID --set status=done --set notes:=null --json
formspring crm records upsert --object projects --match code --set code=P-100 --set name="Relaunch" --json
formspring crm records bulk --object deals --action update --ids id1,id2 --set stage=won --json
formspring crm records delete --object projects --record REC_ID        # queued; restorable from the trash
formspring crm records notes create --object projects --record REC_ID --body "Sent the quote"
formspring crm records tasks create --object projects --record REC_ID --title "Call back" --due 2026-12-01T09:00:00

# Listing: filters, sort, grouping, totals, views and every page
formspring crm records list --object projects --filter status:is:active --filter budget:gte:1000 \
  --sort=-budget --fields name,budget --include client --limit 50 --json
formspring crm records list --object projects --view VIEW_ID --all --json
formspring crm records list --object projects --group-by status --aggregate count,budget:sum --json

# Deleted records, favorites, duplicates and merges
formspring crm trash list --object projects --json
formspring crm trash restore --object projects --ids id1,id2
formspring crm trash erase --object projects --all                     # for good, queued
formspring crm favorites add --type object --object projects
formspring crm duplicates list --object projects --json
formspring crm merge run --object projects --survivor REC_A --loser REC_B --choice budget=loser --json
formspring crm merge undo --object projects --merge MERGE_ID

# Import and export
formspring crm import start --object projects --file projects.csv --json
formspring crm import map --object projects --import IMPORT_ID --map Name=name --map Notes=ignore --match-field code
formspring crm import dry-run --object projects --import IMPORT_ID --wait --json    # writes nothing
formspring crm import run --object projects --import IMPORT_ID --wait --json
formspring crm import rollback --object projects --import IMPORT_ID --wait --json
formspring crm export create --object projects --filter status:is:active --output projects.csv
formspring crm files upload --object projects --field attachments --file brief.pdf --json

# Record page layout, permissions, dashboards, automations
formspring crm layout get --object projects --json
formspring crm layout update --object projects --data @layout.json
formspring crm permissions update --object projects --data @permissions.json
formspring crm dashboards create --data '{"name":"Sales","template":"sales"}' --json
formspring crm dashboards widgets add --dashboard DASH_ID --data @widget.json
formspring crm automations list --object deals --json
formspring crm run-automation --object deals --automation 12 --ids id1,id2 --json
```

**Filters.** `--filter field:operator:value` is repeatable and the conditions are ANDed (`--filter-any` ORs them).
A field of a linked record takes a dotted key (`client.region:is:North`). `in` takes a comma list, `gt/gte/lt/lte` a
number, and `empty`, `not_empty`, `today`, `in_past`, `in_future` take no value. Prefix a value with `json:` to send raw
JSON (`done:is:json:true`). For nested groups pass a JSON tree (inline or `@file`):
`--filter '{"operator":"or","children":[...]}'`. The same flags work on `crm views create|update` and
`crm export create`. Sort with `--sort=-created_at` (the `=` keeps the leading dash from being read as a flag) or
`--sort amount:desc`. `--limit` (alias `--per-page`) sets the page size, 1 to 100; `--all` follows the cursor.

**Data model as a file.** Export the structure (no records) and bring it into another workspace:

```bash
formspring crm schema export --output data-model.json                 # --objects projects,clients for a subset
formspring crm schema plan --file data-model.json --json              # compare, changes nothing
formspring crm schema apply --file data-model.json --json             # all or nothing, idempotent
formspring crm schema apply --file data-model.json --prune --allow-destructive --async --wait
```

`plan` (or `apply --check`) asks the API for a comparison. The shared `--dry-run` flag is different: it only prints the
request the CLI would send. `--prune` also switches off what the file leaves out, and `--allow-destructive` confirms
changes that switch off a field with values, remove options or make a field unique.

**Downloads.** Export and file links are signed and expire; `crm export download` and `crm files download --url ...`
fetch them without sending your token. `crm import errors` returns the failed rows of an import as CSV.

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

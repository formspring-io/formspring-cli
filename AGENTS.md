# Formspring CLI — agent guide

Use `formspring` for scripted access to Formspring when MCP is unavailable or you need shell pipelines.

## Setup

```bash
formspring auth login --base-url https://formspring.io
export FORMSPRING_TOKEN=...   # optional if profile saved
```

## Conventions

- Pass **`--json`** on every call; stdout is JSON only (errors on stderr).
- Use **`--dry-run`** to print the request without sending it.
- Request bodies: **`--data @file.json`** or **`cat file.json | formspring ... --stdin`**.
- Prefer **named commands** when listed in `formspring commands --json`.
- For any `/api/v1` route: **`formspring api request <METHOD> <path>`** with `--form`, `--funnel`, etc. for path params.
- Resource groups (contacts, companies, deals, tasks, links, automations, data tables, documents, signing, bookings, ...) have named commands; path parameters are flags, e.g. `formspring contacts get --contact CONTACT_ID --json`.
- Lists: add **`--all`** to walk every cursor page into one result.
- Writes: add **`--idempotency-key <key>`** so a retry replays the first result instead of writing twice.
- File downloads: **`--output <file>`** streams to disk (required for PDF and ZIP).
- MCP-only (templates, form stats, funnel builder ops): **`formspring mcp invoke <tool>`** or the matching named command.

## Examples

```bash
formspring commands --json
formspring forms list --json
formspring api request GET /forms/{form}/webhooks --form PUBLIC_ID --json
formspring templates list --product survey --json
formspring mcp invoke get_framework_integration_catalog --data '{"page":1}' --json
```

## Errors

| Status | Action |
|--------|--------|
| 401 | `formspring auth login` |
| 402 | Plan needs API or MCP access |
| 403 | Token missing ability — see docs/api/tokens-and-abilities |
| 409 | `idempotency_key_reused`: use a new key. `operation_pending`: wait, then retry with the same key |

Every API error prints a `request_id`; quote it when asking for support.

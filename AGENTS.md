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

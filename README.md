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
# or local: formspring auth login --base-url http://pixel-forms.test
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

## Schema sync (developers)

With a sibling [pixel-forms](https://github.com/formspring-io/pixel-forms) checkout:

```bash
npm run sync-schema
npm run scaffold-commands
npm run build
npm run check:parity
```

Or download production OpenAPI only:

```bash
npm run sync-schema -- --from-url
```

## Docs

- REST API: https://formspring.io/docs/api/overview
- MCP: https://formspring.io/docs/mcp/overview

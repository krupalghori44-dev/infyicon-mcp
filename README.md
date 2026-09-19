# Infyicon MCP Server

[![Official MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.krupalghori44--dev%2Finfyicon--mcp-blue)](https://registry.modelcontextprotocol.io/v0.1/servers?search=infyicon)
[![npm](https://img.shields.io/npm/v/infyicon-mcp?label=npm%20infyicon-mcp)](https://www.npmjs.com/package/infyicon-mcp)
[![Glama TDQS](https://glama.ai/mcp/servers/krupalghori44-dev/infyicon-mcp/badges/score.svg)](https://glama.ai/mcp/connectors/com.infyicon/infyicon)
[![One-click setup](https://img.shields.io/badge/one--click_setup-infyicon.com%2Fconnect-0f62fe)](https://infyicon.com/connect)

Search **161,000+ free hand-drawn vector icons** from any AI assistant — Claude, ChatGPT, Cursor, VS Code / Copilot, Codex, Gemini, Windsurf, Zed, Cline, Goose, LM Studio, JetBrains and every other MCP client. Four matching styles (outline, fill, color-outline, color-fill), ready-to-embed SVG markup, transparent PNGs at 16–512 px, and a 61,000-glyph UI webfont.

- **Hosted endpoint (recommended):** `https://infyicon.com/mcp` — streamable HTTP, stateless, **no auth, no API key**, every tool read-only
- **One-click install buttons + copy-paste config for every client:** https://infyicon.com/connect
- **Icon license:** free for personal & commercial use with attribution to [infyicon.com](https://infyicon.com) — https://infyicon.com/license

## Tools (v1.2.0)

| Tool | What it does |
|---|---|
| `search_icons` | Keyword search over 161,000+ icons, optional style filter, offset paging. Returns ids, names, page/SVG/PNG URLs, tags. |
| `get_popular_icons` | Featured icons when there is no search term. |
| `get_related_icons` | Same-theme icons across styles — build a matching set or offer variations. |
| `get_icon_svg` | Full ready-to-embed SVG markup for one icon id. |
| `get_icon_svg_bulk` | SVG markup for 1–20 icon ids in one call. |
| `get_icon_png` | Transparent PNG URLs at 16 / 24 / 32 / 64 / 128 / 256 / 512 px. |
| `list_categories` | Most popular categories with counts and category-page URLs. |
| `search_uicons` | CSS class names in the Infyicon UI webfont (`<i class="ii-r-home"></i>`). |

Old names from v1.0/1.1 (`popular_icons`, `related_icons`, `bulk_svg`, `uicons_lookup`) are still accepted as aliases.

## Quick start

**Claude.ai / Claude Desktop** — Settings → Connectors → Add custom connector → `https://infyicon.com/mcp`. Or install the desktop extension: [`infyicon.mcpb`](https://infyicon.com/downloads/infyicon.mcpb).

**Claude Code**

```bash
claude mcp add --transport http infyicon https://infyicon.com/mcp
# or as a plugin
claude plugin marketplace add krupalghori44-dev/infyicon-mcp && claude plugin install infyicon@infyicon
```

**ChatGPT** — Settings → Apps & Connectors → Advanced → Developer mode → Create → MCP URL `https://infyicon.com/mcp`, auth *None*.

**Cursor** — [Add to Cursor](https://infyicon.com/connect) or `~/.cursor/mcp.json`:

```json
{ "mcpServers": { "infyicon": { "url": "https://infyicon.com/mcp" } } }
```

**VS Code / GitHub Copilot** — `.vscode/mcp.json`:

```json
{ "servers": { "infyicon": { "type": "http", "url": "https://infyicon.com/mcp" } } }
```

**Codex CLI** — `codex mcp add infyicon --url https://infyicon.com/mcp`

**Gemini CLI** — `gemini mcp add --transport http infyicon https://infyicon.com/mcp` · **Gemini app** — Settings → Connected apps → Add custom MCP server

**Windsurf** — `{ "mcpServers": { "infyicon": { "serverUrl": "https://infyicon.com/mcp" } } }`

**Cline / Roo Code** — `{ "mcpServers": { "infyicon": { "type": "streamableHttp", "url": "https://infyicon.com/mcp" } } }`

**Any stdio-only client (Zed, Goose, LM Studio, JetBrains, Perplexity…)** — the zero-dependency npm bridge relays to the hosted server:

```json
{ "mcpServers": { "infyicon": { "command": "npx", "args": ["-y", "infyicon-mcp"] } } }
```

## Run it yourself

```bash
npx -y infyicon-mcp             # stdio bridge
npx -y infyicon-mcp --http 3000 # local HTTP mirror at POST http://127.0.0.1:3000/mcp
docker build -t infyicon-mcp . && docker run -i infyicon-mcp
```

`standalone.js` relays `initialize`, `tools/list` and `tools/call` to `https://infyicon.com/mcp` (override with `INFYICON_MCP_UPSTREAM`), so it never goes stale. `mcp.js` is the reference implementation that runs on infyicon.com (Express, hand-rolled JSON-RPC, no SDK).

## Repository layout

- `standalone.js` — npm package `infyicon-mcp` (stdio / `--http`)
- `mcp.js` — hosted server source
- `mcpb/` — Claude Desktop extension source; build with `npx @anthropic-ai/mcpb pack mcpb dist/infyicon.mcpb`
- `.claude-plugin/` + `.mcp.json` — Claude Code plugin marketplace
- `connect/connect.html` — the one-click setup page served at https://infyicon.com/connect
- `server.json` — Official MCP Registry manifest

## Privacy

Tool arguments (search words, icon ids, style filters) are sent to infyicon.com over HTTPS; responses contain icon metadata, SVG markup and PNG URLs. No account, API key, telemetry or local file access. Privacy policy: https://infyicon.com/privacy · Contact: info@infyicon.com

## License

Server and bridge code: MIT. Icons: free with attribution — https://infyicon.com/license

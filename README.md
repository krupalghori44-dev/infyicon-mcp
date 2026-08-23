# Infyicon MCP Server

[![krupalghori44-dev/infyicon-mcp MCP server](https://glama.ai/mcp/servers/krupalghori44-dev/infyicon-mcp/badges/score.svg)](https://glama.ai/mcp/servers/krupalghori44-dev/infyicon-mcp)

Search **161,000+ free hand-drawn vector icons** from any MCP client — Claude Desktop, Claude Code, ChatGPT, Cursor, VS Code, Codex, Gemini CLI, Windsurf and more. Every icon comes in four matching styles (outline, fill, color-outline, color-fill) with ready-to-embed SVG markup and PNG URLs at 16–512 px.

- **Hosted endpoint (recommended):** `https://infyicon.com/mcp` — streamable HTTP, stateless, **no auth, no API key**
- **Setup guide with copy-paste config for every client:** https://infyicon.com/developers
- **Icon license:** free for personal & commercial use with attribution to [infyicon.com](https://infyicon.com) — see https://infyicon.com/license

## Tools

| Tool | What it does |
|---|---|
| `search_icons` | Search 161,000+ icons by keyword, optionally filtered to one of the four styles. Returns ids, page URLs, SVG + PNG URLs, tags. |
| `get_icon_svg` | Full SVG markup for an icon id — ready to embed in HTML/JSX/design tools. |
| `get_icon_png` | Direct transparent-PNG URLs (16, 24, 32, 64, 128, 256, 512 px) for an icon id. |
| `list_categories` | Most popular icon categories with counts and category-page URLs. |
| `uicons_lookup` | Look up CSS classes in the Infyicon UI webfont (61,000+ glyphs, `<i class="ii-r-home"></i>`). |

## Quick start — hosted endpoint

**Claude Code**

```bash
claude mcp add --transport http infyicon https://infyicon.com/mcp
```

**Claude Desktop / claude.ai** — Settings → Connectors → Add custom connector → URL `https://infyicon.com/mcp`

**Cursor / VS Code / Windsurf** (`mcp.json`)

```json
{
  "mcpServers": {
    "infyicon": { "url": "https://infyicon.com/mcp" }
  }
}
```

**Codex CLI** (`~/.codex/config.toml`)

```toml
[mcp_servers.infyicon]
url = "https://infyicon.com/mcp"
```

**Gemini CLI** (`~/.gemini/settings.json`)

```json
{
  "mcpServers": {
    "infyicon": { "httpUrl": "https://infyicon.com/mcp" }
  }
}
```

Full, always-current instructions for all clients: **https://infyicon.com/developers**

## Run locally (stdio)

`standalone.js` is a zero-dependency Node 18+ entry point. It answers `initialize` / `tools/list` locally and relays `tools/call` to the hosted endpoint (where the search index and 161k SVG assets live).

```bash
git clone https://github.com/krupalghori44-dev/infyicon-mcp.git
node infyicon-mcp/standalone.js          # MCP over stdio
node infyicon-mcp/standalone.js --http 3000   # or streamable HTTP at :3000
```

Client config for the stdio version:

```json
{
  "mcpServers": {
    "infyicon": { "command": "node", "args": ["/path/to/infyicon-mcp/standalone.js"] }
  }
}
```

### Docker

```bash
docker build -t infyicon-mcp .
docker run -i infyicon-mcp
```

## Repo layout

- `standalone.js` — zero-dependency stdio/HTTP server (local bridge; what the Dockerfile runs)
- `mcp.js` — the production Express module that serves `https://infyicon.com/mcp` (reference; depends on server-side assets)
- `Dockerfile` — builds the standalone bridge

## Example

> "Find me a shopping cart icon in outline style and give me the SVG."

The client calls `search_icons {"query":"shopping cart","style":"outline"}`, picks an id like `shopping-cart-12_10432`, then `get_icon_svg` returns the full markup to paste straight into your project.

## License

Code in this repository: [MIT](LICENSE). Icons served by the API remain free for personal and commercial use **with attribution to infyicon.com** — details at https://infyicon.com/license.

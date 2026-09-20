## What's new in 1.2.0

- **Clearer tool names (verb_noun):** `search_icons`, `get_icon_svg`, `get_icon_svg_bulk`, `get_icon_png`, `get_popular_icons`, `get_related_icons`, `list_categories`, `search_uicons`. The old names still work as hidden aliases in `tools/call`, so existing clients are not broken.
- **Better tool descriptions:** every tool now has a title, `readOnlyHint` / `idempotentHint` annotations, when-to-use / when-not-to-use guidance, and documented error and limit behaviour.
- **Standalone stdio bridge** (`standalone.js`): run the server locally with `npx -y infyicon-mcp` (or `--http 3000` for a local HTTP mirror).
- **Claude Desktop extension:** `infyicon.mcpb` is attached below (also hosted at https://infyicon.com/downloads/infyicon.mcpb). Source in `mcpb/`.
- **Claude Code plugin marketplace** (`.claude-plugin/`) and `.mcp.json` for one-command install.
- **One-click connect page:** https://infyicon.com/connect — Cursor, VS Code, Claude.ai, Claude Code, ChatGPT, Codex, Gemini, Windsurf, Cline, Zed, LM Studio, Goose, Docker.
- `server.json` updated to 1.2.0 with the npm package entry (MCP Registry).

## Install

- Remote (no install): `https://infyicon.com/mcp`
- npm: `npx -y infyicon-mcp`
- Claude Desktop: download `infyicon.mcpb` below and open it.

161,000+ free icons, no API key needed. Licence: https://infyicon.com/license

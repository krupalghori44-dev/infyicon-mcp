# Infyicon MCP — installation guide for AI agents (Cline, Roo Code, Cursor, etc.)

Infyicon is a **remote, read-only MCP server** at `https://infyicon.com/mcp` (streamable HTTP, stateless).
There is nothing to download or build, no account, no API key and no environment variables.

## Cline (recommended: remote server)

Add this to `cline_mcp_settings.json` (Cline → MCP Servers → Configure):

```json
{
  "mcpServers": {
    "infyicon": {
      "type": "streamableHttp",
      "url": "https://infyicon.com/mcp",
      "disabled": false,
      "autoApprove": [
        "search_icons",
        "get_popular_icons",
        "get_related_icons",
        "get_icon_svg",
        "get_icon_svg_bulk",
        "get_icon_png",
        "list_categories",
        "search_uicons"
      ]
    }
  }
}
```

All eight tools are read-only, so auto-approving them is safe.

## Alternative: local stdio bridge (for clients without HTTP support)

Requires Node.js 18+. The bridge relays to the hosted server, so it never goes stale.

```json
{
  "mcpServers": {
    "infyicon": {
      "command": "npx",
      "args": ["-y", "infyicon-mcp"],
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

## Verify

Call `search_icons` with `{"query": "shopping cart", "limit": 3}`. You should get three icons with `id`, `page`, `svg_url` and `png_512` fields. Then call `get_icon_svg` with one of the ids to receive embeddable SVG markup.

## Tools

| Tool | Purpose |
|---|---|
| `search_icons` | Keyword search over 161,000+ icons; optional `style` (outline, fill, color-outline, color-fill), `limit` ≤ 30, `offset` paging |
| `get_popular_icons` | Featured icons when there is no search term |
| `get_related_icons` | Same-theme icons across styles for one icon id |
| `get_icon_svg` | Ready-to-embed SVG markup for one id |
| `get_icon_svg_bulk` | SVG markup for 1–20 ids in one call |
| `get_icon_png` | Transparent PNG URLs at 16–512 px |
| `list_categories` | Popular categories with counts and page URLs |
| `search_uicons` | CSS class names in the Infyicon UI webfont |

Icons are free for personal and commercial use with attribution to infyicon.com — https://infyicon.com/license

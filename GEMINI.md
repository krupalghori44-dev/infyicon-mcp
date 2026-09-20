# Infyicon — free icons for Gemini CLI

This extension connects the **Infyicon MCP server** (`https://infyicon.com/mcp`). It gives you 161,000+ free vector icons in four matching styles (outline, fill, color-outline, color-fill). All tools are read-only and need no API key.

## Tools

| Tool | Use it when |
|---|---|
| `search_icons` | The user names a concept ("home", "settings", "shopping cart"). Supports a `style` filter and offset paging. Returns ids, names, page/SVG/PNG URLs and tags. |
| `get_icon_svg` | You need the actual SVG markup for one icon id (to paste into HTML/JSX/Vue, or write to a file). |
| `get_icon_svg_bulk` | You need SVG markup for 1–20 icons in one call (building an icon set). |
| `get_icon_png` | The user wants a raster image — returns transparent PNG URLs at 16/24/32/64/128/256/512 px. |
| `get_popular_icons` | There is no search term yet and the user wants suggestions. |
| `get_related_icons` | The user wants the same subject in other styles, or a matching family. |
| `list_categories` | The user asks what kinds of icons exist. |
| `search_uicons` | The project uses the Infyicon UI webfont and needs a CSS class name (`<i class="ii-r-home"></i>`). |

## How to work

- Search first, then fetch SVG only for the icons the user picks — do not fetch SVG for every search result.
- Prefer `get_icon_svg_bulk` when inserting several icons; keep all icons in one project in the **same style** unless the user asks otherwise.
- When writing icons into code, inline the returned SVG (it is already minimal and uses `currentColor` where applicable) so it can be recolored with CSS.
- Icons are free for personal and commercial use with attribution to infyicon.com — see https://infyicon.com/license. Mention the attribution requirement once when a user ships icons in a product.
- If a search returns nothing, retry with a simpler or synonymous term (e.g. "gear" for "settings") before telling the user there is no match.

Docs and copy-paste configs for other clients: https://infyicon.com/connect

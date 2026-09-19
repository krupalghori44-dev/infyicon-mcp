# Infyicon MCP — listing pack (copy-paste for every directory / portal)

Server URL: `https://infyicon.com/mcp` · transport: Streamable HTTP · auth: **None** · every tool read-only · version 1.2.0

## Identity

- Name: **Infyicon**
- Publisher / operator: **Infyicon** (individual developer: Krupal Ghori, India)
- Website: https://infyicon.com
- Documentation / setup: https://infyicon.com/developers · one-click page: https://infyicon.com/connect
- Support: https://infyicon.com/contact · email: info@infyicon.com
- Privacy policy: https://infyicon.com/privacy
- Terms: https://infyicon.com/terms
- Icon license: https://infyicon.com/license
- Source: https://github.com/krupalghori44-dev/infyicon-mcp (MIT)
- Logo 512px: https://infyicon.com/icon-512.png · square: https://infyicon.com/logo-square.png
- Categories: Design Tools · Developer Tools · Productivity · Images / Media

## Tagline (≤55 chars)

`161,000+ free icons as SVG or PNG, no API key`

## Short description (≤160 chars)

`Search 161,000+ free hand-drawn icons in four matching styles and get ready-to-embed SVG or transparent PNG. Free with attribution, no API key.`

## Long description

Infyicon gives your assistant a free library of 161,000+ hand-drawn vector icons in four matching styles — outline, fill, color-outline and color-fill — plus a 61,000-glyph UI webfont.

Ask for "six matching outline icons for a fitness app" and it searches, picks a consistent set, and returns the SVG markup ready to paste into HTML, React, Figma, Canva, Notion or a slide. Need an image instead? It returns transparent PNG links at 16–512 px. Building with an icon font? It looks up the CSS class.

Tools: search_icons (keyword search with style filter and paging), get_popular_icons, get_related_icons (matching sets / variations), get_icon_svg, get_icon_svg_bulk (up to 20 per call), get_icon_png, list_categories, search_uicons.

Everything is read-only, needs no account or API key, and returns only public icon data. Icons are free for personal and commercial use with attribution to infyicon.com.

## Use cases (portal "Use cases" step)

1. Designers/developers asking for icons while building UI, slides, docs or marketing assets — get SVG/PNG instantly without leaving the chat.
2. Building a consistent icon set: search → related icons → bulk SVG in one flow.
3. Content creators needing quick PNG icons for emails, social posts, presentations.
What users need first: nothing — no account, plan or setup. Reads data only; writes nothing.

## Starter prompts

- "Find me 6 matching outline icons for a fitness app and give me the SVG code"
- "Give me a transparent PNG of a coffee cup icon at 128 px"
- "Show popular icons in the color-fill style"
- "What's the Infyicon webfont class for a home icon?"
- "List the most popular icon categories"
- "I have icon id hammer-16_66091 — show me related icons in other styles"

## Test cases (OpenAI portal: 5 positive + 3 negative)

Positive
1. Prompt: "Search for a shopping cart icon" → expected: calls `search_icons` with query "shopping cart"; reply lists several icons with ids, styles and page/SVG/PNG links.
2. Prompt: "Give me the SVG code for hammer-16_66091" → expected: calls `get_icon_svg`; reply contains `<svg` markup and attribution note.
3. Prompt: "PNG of a doctor icon, 256px" → expected: `search_icons` then `get_icon_png` with size 256; reply contains a URL ending in `/png/256/….png`.
4. Prompt: "6 matching outline icons for a fitness app, SVGs please" → expected: `search_icons` (style outline) and/or `get_related_icons`, then `get_icon_svg_bulk` with ≤20 ids; reply returns several `<svg` blocks.
5. Prompt: "Which CSS class shows a home icon from the Infyicon webfont?" → expected: calls `search_uicons` with name "home"; reply includes `ii-r-home` and the stylesheet link https://infyicon.com/uicons/uicons.css.

Negative
1. Prompt: "Get the SVG for icon id banana" → expected: `get_icon_svg` returns an error (bad id format); assistant explains ids look like slug_number and offers to search instead. No crash, no invented SVG.
2. Prompt: "Search icons for '' (empty)" / "search for nothing" → expected: tool returns `query is required` error; assistant asks what to search for.
3. Prompt: "Upload this icon to my Figma file" / "delete icon hammer-16_66091" → expected: assistant states the connector is read-only and cannot write or delete; no tool with side effects exists.

## Compliance answers

- Authentication: None (public, read-only). Test account: not needed.
- Data handling: our own first-party API (infyicon.com); no personal health data; no sponsored content; no ads.
- Financial transactions: none. AI media generation: none (library of human-drawn icons). Prompt injection: tool outputs are plain JSON with icon metadata only.
- Content security policy (OpenAI): no custom UI → not applicable.
- Country availability: all countries.
- Release notes v1.2.0: consistent verb_noun tool names (old names kept as aliases), titles + readOnly/idempotent annotations on every tool, new get_popular_icons / get_related_icons / get_icon_svg_bulk, usage guidance in every description.

## Keywords

icons, svg, png, free icons, icon library, design, ui, webfont, vector, illustration, mcp, infyicon

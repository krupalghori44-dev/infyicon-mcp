/* Infyicon MCP server (#35) — Model Context Protocol over streamable HTTP.
 * Stateless JSON-RPC at POST /mcp; lets Claude Desktop/Code, ChatGPT, Cursor,
 * Codex, VS Code, Gemini CLI, Hermes etc. search and fetch Infyicon icons.
 * Hand-rolled (no SDK dependency): initialize / tools/list / tools/call / ping.
 * Docs for humans: https://infyicon.com/mcp-setup (served by the site).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const BASE = 'https://infyicon.com';
const ASSETS = '/var/www/infyicon/assets-v2';
const GLYPHS = '/var/www/uicons/glyphs.json';
const ATTR = 'License: free for personal & commercial use WITH attribution to infyicon.com (link https://infyicon.com). Details: https://infyicon.com/license';
const STYLES = ['outline', 'fill', 'color-outline', 'color-fill'];
const PROTO = '2025-06-18';

function localGet(p) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port: process.env.PORT || 4571, path: p, timeout: 10000 }, r => {
      let b = '';
      r.on('data', c => { b += c; });
      r.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

let glyphCache = null, glyphAt = 0;
function glyphs() {
  if (!glyphCache || Date.now() - glyphAt > 600000) {
    try { glyphCache = JSON.parse(fs.readFileSync(GLYPHS, 'utf8')); glyphAt = Date.now(); } catch (e) { glyphCache = { names: [], count: 0 }; }
  }
  return glyphCache;
}

const iconObj = ic => ({
  id: `${ic.slug}_${ic.id}`,
  name: ic.name,
  style: ic.style,
  page: `${BASE}/free-icon/${ic.slug}_${ic.id}`,
  svg_url: `${BASE}/i2/${ic.style}/svg/${ic.slug}_${ic.id}.svg`,
  png_512: `${BASE}/i2/${ic.style}/png/512/${ic.slug}_${ic.id}.png`,
  tags: (ic.tags || []).slice(0, 6),
});

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
// Old tool names (pre 2026-09-19) still work in tools/call so existing clients do not break; only the new names are listed.
const ALIASES = {
  popular_icons: 'get_popular_icons',
  related_icons: 'get_related_icons',
  bulk_svg: 'get_icon_svg_bulk',
  uicons_lookup: 'search_uicons',
};

const TOOLS = [
  {
    name: 'search_icons',
    title: 'Search icons',
    description: 'Search 161,000+ free Infyicon vector icons by keyword and return up to 30 matches per page, each with icon id (slug_number), name, style, page URL, direct SVG URL, 512px PNG URL and tags. Styles: outline (black line), fill (black solid), color-outline, color-fill. Use this first whenever the user describes what icon they want; then pass an id to get_icon_svg, get_icon_svg_bulk or get_icon_png. Use get_popular_icons instead when there is no search term, and search_uicons instead when the user wants a CSS webfont class rather than an SVG/PNG file. Read-only, no auth, no API key; empty query returns an error; total_matches + next_offset are returned for paging. Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for, e.g. "shopping cart", "doctor", "hammer" (1-4 plain words work best)' },
        style: { type: 'string', enum: STYLES, description: 'Optional: restrict to one style; omit to get all four styles mixed' },
        limit: { type: 'integer', minimum: 1, maximum: 30, description: 'Max results per page (default 10, max 30)' },
        offset: { type: 'integer', minimum: 0, description: 'Optional: skip this many results for pagination. Pass next_offset from the previous response to get the next page.' },
      },
      required: ['query'],
    },
    annotations: RO,
  },
  {
    name: 'get_popular_icons',
    title: 'Get popular icons',
    description: 'Return up to 30 popular/featured Infyicon icons (ids, names, styles, page/SVG/PNG URLs) without a search query - use when the user just wants "a nice icon" or a starting set and has not named a subject. Use search_icons instead when the user describes a subject, and get_related_icons instead when they already have an icon and want variations. Read-only, no auth; always returns results (never errors on empty input). Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: {
        style: { type: 'string', enum: STYLES, description: 'Optional: restrict to one style' },
        limit: { type: 'integer', minimum: 1, maximum: 30, description: 'Max results (default 12, max 30)' },
      },
    },
    annotations: RO,
  },
  {
    name: 'get_related_icons',
    title: 'Get related icons',
    description: 'Given one icon id (from search_icons or get_popular_icons), return up to 30 related Infyicon icons on the same theme in the same and other styles - use for offering variations, alternatives or building a matching icon set. Use search_icons instead when you do not yet have an id. The source icon itself is excluded from results. Read-only, no auth; returns an error if the id is not in slug_number format. Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Icon id like hammer-16_66091 (slug_number, as returned by search_icons)' },
        limit: { type: 'integer', minimum: 1, maximum: 30, description: 'Max results (default 12, max 30)' },
      },
      required: ['id'],
    },
    annotations: RO,
  },
  {
    name: 'get_icon_svg',
    title: 'Get icon SVG',
    description: 'Return the full, ready-to-embed SVG markup of ONE Infyicon icon by id (slug_number, e.g. hammer-16_66091 - get ids from search_icons). Use when the user wants inline SVG for a single icon; use get_icon_svg_bulk for 2-20 icons in one call, and get_icon_png when they need a raster image URL instead of markup. Read-only, no auth; returns an error for a malformed id or an unknown icon; if the SVG is over 200 KB the response carries svg_url instead of inline markup. Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Icon id like hammer-16_66091 (slug_number)' } },
      required: ['id'],
    },
    annotations: RO,
  },
  {
    name: 'get_icon_svg_bulk',
    title: 'Get SVG for several icons',
    description: 'Return ready-to-embed SVG markup for 1-20 Infyicon icons in one call (pass an array of ids from search_icons). Use when building a UI, icon set or design system so you fetch several icons at once instead of calling get_icon_svg repeatedly; use get_icon_svg for a single icon. Read-only, no auth; ids beyond the first 20 are silently dropped; each bad or unknown id gets a per-item error while the rest still succeed; oversized SVGs (>200 KB) return svg_url instead of markup. Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20, description: 'Array of 1-20 icon ids, e.g. ["home-2_101", "gear-1_202"]' },
      },
      required: ['ids'],
    },
    annotations: RO,
  },
  {
    name: 'get_icon_png',
    title: 'Get icon PNG URLs',
    description: 'Return direct PNG download URLs (transparent background) for one Infyicon icon id, either a single size or all seven sizes 16/24/32/64/128/256/512 px. Use when the user needs an image file or <img> src (email, docs, chat, platforms that cannot render SVG); use get_icon_svg instead when inline vector markup is wanted. Read-only, no auth; returns URLs only (no binary data); returns an error for a malformed id or an unknown icon. Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Icon id like hammer-16_66091 (slug_number)' },
        size: { type: 'integer', enum: [16, 24, 32, 64, 128, 256, 512], description: 'Optional single size in px; omit to get all seven sizes' },
      },
      required: ['id'],
    },
    annotations: RO,
  },
  {
    name: 'list_categories',
    title: 'List icon categories',
    description: 'List the most popular Infyicon icon categories (name, slug, icon count, category page URL at https://infyicon.com/free-icons/<slug>), ordered by popularity. Use to browse or suggest topics before searching, or to link the user to a category page; use search_icons to actually fetch icons for a topic. Read-only, no auth; no pagination (limit up to 100). Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Max categories (default 30, max 100)' } },
    },
    annotations: RO,
  },
  {
    name: 'search_uicons',
    title: 'Search UI webfont classes',
    description: 'Search the Infyicon UI webfont (61,000+ glyphs) by glyph name and return matching CSS class names (regular ii-r-<name>, solid ii-s-<name>) plus a ready <i> tag and the stylesheet link https://infyicon.com/uicons/uicons.css. Use ONLY when the user wants an icon font / CSS class (like Font Awesome usage); use search_icons for SVG or PNG icon files. Case-insensitive substring match, up to 40 matches, no pagination; empty name returns an error. Read-only, no auth. Free with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Glyph name or part of it to search, e.g. "home", "arrow"' } },
      required: ['name'],
    },
    annotations: RO,
  },
];

function parseId(id) {
  const m = /^([a-z0-9-]+)_(\d+)$/.exec(String(id || '').trim());
  return m ? { slug: m[1], num: m[2] } : null;
}

// SEO rewrite (Sep 2026): slugs change, numeric ids never do. Resolve a stale id by its number.
const ICONS2 = '/var/www/infyicon/data/icons2.json';
let _numMap = null, _numMtime = 0;
function resolveNum(num) {
  try {
    const mt = fs.statSync(ICONS2).mtimeMs;
    if (!_numMap || mt !== _numMtime) {
      _numMap = new Map();
      for (const ic of JSON.parse(fs.readFileSync(ICONS2, 'utf8'))) _numMap.set(String(ic.id), { slug: ic.slug, style: ic.style });
      _numMtime = mt;
    }
    return _numMap.get(String(num)) || null;
  } catch (e) { return null; }
}
function findSvg(slug, num) {
  for (const st of STYLES) {
    const p = path.join(ASSETS, st, 'svg', `${slug}_${num}.svg`);
    if (fs.existsSync(p)) return { st, p, slug };
  }
  const cur = resolveNum(num);                       // stale slug -> current one
  if (cur && cur.slug !== slug) {
    const p = path.join(ASSETS, cur.style, 'svg', `${cur.slug}_${num}.svg`);
    if (fs.existsSync(p)) return { st: cur.style, p, slug: cur.slug };
  }
  return null;
}

async function callTool(name, args) {
  args = args || {};
  name = ALIASES[name] || name;
  if (name === 'search_icons') {
    const q = String(args.query || '').trim();
    if (!q) return { error: 'query is required' };
    const lim = Math.min(Math.max(parseInt(args.limit, 10) || 10, 1), 30);
    const off = Math.max(parseInt(args.offset, 10) || 0, 0);
    const st = args.style && STYLES.includes(args.style) ? '&style=' + args.style : '';
    const d = await localGet('/api/search?q=' + encodeURIComponent(q) + st + '&off=' + off + '&size=' + lim);
    let items = (d && (d.v2 || d.items)) || [];
    if (args.style && STYLES.includes(args.style)) items = items.filter(x => x.style === args.style);
    items = items.slice(0, lim).map(iconObj);
    const total = (d && d.total) || (off + items.length);
    const hasMore = d && typeof d.hasMore === 'boolean' ? d.hasMore : (off + items.length < total);
    return {
      query: q, style: args.style || 'all', offset: off, returned: items.length,
      total_matches: total, has_more: hasMore, next_offset: hasMore ? off + items.length : null,
      icons: items,
      note: 'Use get_icon_svg with an id for embeddable SVG markup, or get_icon_svg_bulk for several at once. ' + ATTR,
    };
  }
  if (name === 'get_popular_icons') {
    const lim = Math.min(Math.max(parseInt(args.limit, 10) || 12, 1), 30);
    const st = args.style && STYLES.includes(args.style) ? 'style=' + args.style + '&' : '';
    const d = await localGet('/api/list?' + st + 'page=0&size=' + lim);
    let items = ((d && (d.v2 || d.items)) || []).slice(0, lim).map(iconObj);
    return {
      style: args.style || 'all', returned: items.length, total_library: (d && d.total) || null,
      icons: items, note: 'Popular free Infyicon icons — no search needed. ' + ATTR,
    };
  }
  if (name === 'get_related_icons') {
    const pid = parseId(args.id);
    if (!pid) return { error: 'id must look like hammer-16_66091 (use search_icons first)' };
    const lim = Math.min(Math.max(parseInt(args.limit, 10) || 12, 1), 30);
    const base = pid.slug.replace(/-\d+$/, '').replace(/-/g, ' ').trim() || pid.slug;
    const d = await localGet('/api/search?q=' + encodeURIComponent(base) + '&off=0&size=' + (lim + 6));
    let items = ((d && (d.v2 || d.items)) || []).filter(x => `${x.slug}_${x.id}` !== args.id).slice(0, lim).map(iconObj);
    return {
      source_id: args.id, theme: base, returned: items.length, icons: items,
      note: 'Related Infyicon icons — same theme across styles. ' + ATTR,
    };
  }
  if (name === 'get_icon_svg_bulk') {
    let ids = args.ids;
    if (typeof ids === 'string') ids = [ids];
    if (!Array.isArray(ids) || !ids.length) return { error: 'ids must be a non-empty array of icon ids like ["home-2_101","gear-1_202"]' };
    ids = ids.slice(0, 20);
    const out = ids.map(id => {
      const pid = parseId(id);
      if (!pid) return { id, error: 'bad id format' };
      const hit = findSvg(pid.slug, pid.num);
      if (!hit) return { id, error: 'icon not found' };
      const svg = fs.readFileSync(hit.p, 'utf8');
      if (svg.length > 200000) return { id: `${hit.slug}_${pid.num}`, style: hit.st, svg_url: `${BASE}/i2/${hit.st}/svg/${hit.slug}_${pid.num}.svg` };
      return { id: `${hit.slug}_${pid.num}`, style: hit.st, svg };
    });
    return { requested: ids.length, returned: out.filter(o => o.svg || o.svg_url).length, icons: out, attribution: ATTR };
  }
  if (name === 'get_icon_svg') {
    const pid = parseId(args.id);
    if (!pid) return { error: 'id must look like hammer-16_66091 (use search_icons first)' };
    const hit = findSvg(pid.slug, pid.num);
    if (!hit) return { error: 'icon not found: ' + args.id };
    const svg = fs.readFileSync(hit.p, 'utf8');
    if (svg.length > 200000) {
      return { id: `${hit.slug}_${pid.num}`, style: hit.st, svg_url: `${BASE}/i2/${hit.st}/svg/${hit.slug}_${pid.num}.svg`, note: 'SVG too large to inline; download from svg_url. ' + ATTR };
    }
    return { id: `${hit.slug}_${pid.num}`, style: hit.st, page: `${BASE}/free-icon/${hit.slug}_${pid.num}`, svg, attribution: ATTR };
  }
  if (name === 'get_icon_png') {
    const pid = parseId(args.id);
    if (!pid) return { error: 'id must look like hammer-16_66091 (use search_icons first)' };
    const hit = findSvg(pid.slug, pid.num);
    if (!hit) return { error: 'icon not found: ' + args.id };
    const sizes = args.size ? [args.size] : [16, 24, 32, 64, 128, 256, 512];
    const urls = {};
    for (const s of sizes) urls[s] = `${BASE}/i2/${hit.st}/png/${s}/${hit.slug}_${pid.num}.png`;
    return { id: `${hit.slug}_${pid.num}`, style: hit.st, png_urls: urls, page: `${BASE}/free-icon/${hit.slug}_${pid.num}`, attribution: ATTR };
  }
  if (name === 'list_categories') {
    const lim = Math.min(Math.max(parseInt(args.limit, 10) || 30, 1), 100);
    const d = await localGet('/api/cats');
    const cats = ((d && d.cats) || []).slice(0, lim).map(c => ({ name: c.title, slug: c.slug, icons: c.count, url: `${BASE}/free-icons/${c.slug}` }));
    return { categories: cats, total_categories: (d && d.total) || cats.length };
  }
  if (name === 'search_uicons') {
    const q = String(args.name || '').trim().toLowerCase();
    if (!q) return { error: 'name is required' };
    const g = glyphs();
    const hits = (g.names || []).filter(n => n.includes(q)).slice(0, 40);
    return {
      matches: hits.map(n => ({ name: n, regular_class: `ii-r-${n}`, solid_class: `ii-s-${n}`, html: `<i class="ii-r-${n}"></i>` })),
      total_glyphs: g.count || 0,
      stylesheet: `${BASE}/uicons/uicons.css`,
      setup: `<link rel="stylesheet" href="${BASE}/uicons/uicons.css">`,
      note: ATTR,
    };
  }
  return { error: 'unknown tool: ' + name };
}

function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, msg) { return { jsonrpc: '2.0', id, error: { code, message: msg } }; }

async function handle(msg) {
  if (!msg || msg.jsonrpc !== '2.0') return rpcError(msg && msg.id != null ? msg.id : null, -32600, 'Invalid Request');
  const { id, method, params } = msg;
  if (method && method.indexOf('notifications/') === 0) return null; // no response
  if (method === 'initialize') {
    return rpcResult(id, {
      protocolVersion: (params && params.protocolVersion) === '2025-03-26' ? '2025-03-26' : PROTO,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'infyicon', title: 'Infyicon — 161,000+ free icons', version: '1.2.0' },
      instructions: 'Search and fetch free Infyicon vector icons (SVG/PNG) and UI-webfont CSS classes. All icons are free with attribution to infyicon.com. Typical flow: search_icons (offset paging) -> get_icon_svg (embed one SVG), get_icon_svg_bulk (embed up to 20 at once) or get_icon_png (link a PNG). No search term yet? get_popular_icons. Have an icon and want variations? get_related_icons. Want a CSS icon-font class instead of a file? search_uicons. All tools are read-only and need no API key.',
    });
  }
  if (method === 'ping') return rpcResult(id, {});
  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const name = params && params.name;
    try {
      const out = await callTool(name, params && params.arguments);
      const isErr = !!(out && out.error);
      return rpcResult(id, { content: [{ type: 'text', text: JSON.stringify(out, null, 1) }], isError: isErr });
    } catch (e) {
      return rpcResult(id, { content: [{ type: 'text', text: 'Tool failed: ' + e.message }], isError: true });
    }
  }
  if (id == null) return null; // unknown notification
  return rpcError(id, -32601, 'Method not found: ' + method);
}

module.exports = function (app) {
  const express = require('express');
  app.use('/mcp', express.json({ limit: '1mb' }));
  const cors = res => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID');
    res.set('Access-Control-Expose-Headers', 'Mcp-Session-Id');
  };
  app.options('/mcp', (req, res) => { cors(res); res.status(204).end(); });
  app.get('/mcp', (req, res) => {
    cors(res);
    res.status(405).json({ jsonrpc: '2.0', error: { code: -32000, message: 'This MCP server is stateless: use HTTP POST. Setup guide: https://infyicon.com/developers' }, id: null });
  });
  app.post('/mcp', async (req, res) => {
    cors(res);
    try {
      const body = req.body;
      if (Array.isArray(body)) {
        const outs = [];
        for (const m of body) { const r = await handle(m); if (r) outs.push(r); }
        if (!outs.length) return res.status(202).end();
        return res.json(outs);
      }
      const out = await handle(body);
      if (!out) return res.status(202).end();
      res.json(out);
    } catch (e) {
      res.status(500).json(rpcError(null, -32603, 'Internal error'));
    }
  });
  console.log('mcp endpoint mounted at /mcp');
};
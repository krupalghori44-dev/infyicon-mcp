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

const TOOLS = [
  {
    name: 'search_icons',
    description: 'Search 161,000+ free Infyicon vector icons. Returns matches with icon id, style, page URL, SVG and PNG URLs. Styles: outline (black line), fill (black solid), color-outline, color-fill. Free to use with attribution to infyicon.com.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What to search for, e.g. "shopping cart", "doctor", "hammer"' },
        style: { type: 'string', enum: STYLES, description: 'Optional: restrict to one style' },
        limit: { type: 'integer', minimum: 1, maximum: 30, description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_icon_svg',
    description: 'Get the full SVG markup of an Infyicon icon by id (format: slug_number, e.g. hammer-16_66091 — get ids from search_icons). Returns ready-to-embed SVG code.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Icon id like hammer-16_66091' } },
      required: ['id'],
    },
  },
  {
    name: 'get_icon_png',
    description: 'Get direct PNG download URLs (16-512px, transparent background) for an Infyicon icon id.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Icon id like hammer-16_66091' },
        size: { type: 'integer', enum: [16, 24, 32, 64, 128, 256, 512], description: 'Optional single size; omit for all sizes' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_categories',
    description: 'List the most popular Infyicon icon categories with icon counts. Category pages live at https://infyicon.com/free-icons/<slug>.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 100, description: 'Max categories (default 30)' } },
    },
  },
  {
    name: 'uicons_lookup',
    description: 'Look up CSS class names in the Infyicon UI webfont (61,000+ glyphs). Use the returned class like <i class="ii-r-home"></i> with stylesheet https://infyicon.com/uicons/uicons.css',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'Glyph name to search, e.g. "home", "arrow"' } },
      required: ['name'],
    },
  },
];

function parseId(id) {
  const m = /^([a-z0-9-]+)_(\d+)$/.exec(String(id || '').trim());
  return m ? { slug: m[1], num: m[2] } : null;
}

function findSvg(slug, num) {
  for (const st of STYLES) {
    const p = path.join(ASSETS, st, 'svg', `${slug}_${num}.svg`);
    if (fs.existsSync(p)) return { st, p };
  }
  return null;
}

async function callTool(name, args) {
  args = args || {};
  if (name === 'search_icons') {
    const q = String(args.query || '').trim();
    if (!q) return { error: 'query is required' };
    const lim = Math.min(Math.max(parseInt(args.limit, 10) || 10, 1), 30);
    const d = await localGet('/api/search?q=' + encodeURIComponent(q));
    let items = (d && d.v2) || [];
    if (args.style && STYLES.includes(args.style)) items = items.filter(x => x.style === args.style);
    items = items.slice(0, lim).map(iconObj);
    return {
      query: q, total_matches: (d && d.total) || items.length, returned: items.length, icons: items,
      note: 'Use get_icon_svg with an id for embeddable SVG markup. ' + ATTR,
    };
  }
  if (name === 'get_icon_svg') {
    const pid = parseId(args.id);
    if (!pid) return { error: 'id must look like hammer-16_66091 (use search_icons first)' };
    const hit = findSvg(pid.slug, pid.num);
    if (!hit) return { error: 'icon not found: ' + args.id };
    const svg = fs.readFileSync(hit.p, 'utf8');
    if (svg.length > 200000) {
      return { id: args.id, style: hit.st, svg_url: `${BASE}/i2/${hit.st}/svg/${pid.slug}_${pid.num}.svg`, note: 'SVG too large to inline; download from svg_url. ' + ATTR };
    }
    return { id: args.id, style: hit.st, page: `${BASE}/free-icon/${pid.slug}_${pid.num}`, svg, attribution: ATTR };
  }
  if (name === 'get_icon_png') {
    const pid = parseId(args.id);
    if (!pid) return { error: 'id must look like hammer-16_66091 (use search_icons first)' };
    const hit = findSvg(pid.slug, pid.num);
    if (!hit) return { error: 'icon not found: ' + args.id };
    const sizes = args.size ? [args.size] : [16, 24, 32, 64, 128, 256, 512];
    const urls = {};
    for (const s of sizes) urls[s] = `${BASE}/i2/${hit.st}/png/${s}/${pid.slug}_${pid.num}.png`;
    return { id: args.id, style: hit.st, png_urls: urls, page: `${BASE}/free-icon/${pid.slug}_${pid.num}`, attribution: ATTR };
  }
  if (name === 'list_categories') {
    const lim = Math.min(Math.max(parseInt(args.limit, 10) || 30, 1), 100);
    const d = await localGet('/api/cats');
    const cats = ((d && d.cats) || []).slice(0, lim).map(c => ({ name: c.title, slug: c.slug, icons: c.count, url: `${BASE}/free-icons/${c.slug}` }));
    return { categories: cats, total_categories: (d && d.total) || cats.length };
  }
  if (name === 'uicons_lookup') {
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
      serverInfo: { name: 'infyicon', title: 'Infyicon — 161,000+ free icons', version: '1.0.0' },
      instructions: 'Search and fetch free Infyicon vector icons (SVG/PNG) and UI-font glyph classes. All icons are free with attribution to infyicon.com. Typical flow: search_icons -> get_icon_svg (embed the SVG) or get_icon_png (link a PNG).',
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

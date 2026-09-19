#!/usr/bin/env node
/* Infyicon MCP — standalone entry point.
 * Speaks MCP over stdio (default) or streamable HTTP (--http [port]).
 * Protocol handling (initialize / ping / tools/list) is answered locally;
 * tools/call is relayed to the hosted endpoint https://infyicon.com/mcp,
 * where the 161,000-icon search index and SVG assets live.
 * Zero npm dependencies — Node 18+ core modules only.
 *
 * Usage:
 *   node standalone.js            # stdio mode (for MCP clients / Docker)
 *   node standalone.js --http 3000# HTTP mode at POST /mcp
 */
'use strict';
const https = require('https');
const http = require('http');
const readline = require('readline');

const UPSTREAM = process.env.INFYICON_MCP_UPSTREAM || 'https://infyicon.com/mcp';
const PROTO = '2025-06-18';
const STYLES = ['outline', 'fill', 'color-outline', 'color-fill'];

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

function rpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function rpcError(id, code, msg) { return { jsonrpc: '2.0', id, error: { code, message: msg } }; }

function relay(msg) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(UPSTREAM); } catch (e) { return resolve(rpcError(msg.id != null ? msg.id : null, -32603, 'Bad INFYICON_MCP_UPSTREAM url')); }
    const body = JSON.stringify(msg);
    const req = (u.protocol === 'https:' ? https : http).request({
      host: u.hostname,
      port: u.port || (u.protocol === 'https:' ? 443 : 80),
      path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
    }, r => {
      let b = '';
      r.on('data', c => { b += c; });
      r.on('end', () => {
        try { resolve(JSON.parse(b)); }
        catch (e) { resolve(rpcError(msg.id != null ? msg.id : null, -32603, 'Bad upstream response (HTTP ' + r.statusCode + ')')); }
      });
    });
    req.on('error', e => resolve(rpcError(msg.id != null ? msg.id : null, -32603, 'Upstream unreachable: ' + e.message)));
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
    req.end(body);
  });
}

async function handle(msg) {
  if (!msg || msg.jsonrpc !== '2.0') return rpcError(msg && msg.id != null ? msg.id : null, -32600, 'Invalid Request');
  const { id, method, params } = msg;
  if (method && method.indexOf('notifications/') === 0) return null; // no response
  if (method === 'initialize' || method === 'tools/list') {
    // relay so clients always see the live tool definitions; fall back to the bundled copy when offline
    const up = await relay(msg);
    if (up && up.result) return up;
      return rpcResult(id, {
      protocolVersion: (params && params.protocolVersion) === '2025-03-26' ? '2025-03-26' : PROTO,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'infyicon', title: 'Infyicon — 161,000+ free icons', version: '1.2.0' },
      instructions: 'Search and fetch free Infyicon vector icons (SVG/PNG) and UI-webfont CSS classes. All icons are free with attribution to infyicon.com. Typical flow: search_icons -> get_icon_svg / get_icon_svg_bulk / get_icon_png. No search term? get_popular_icons. Variations? get_related_icons. CSS icon-font class? search_uicons.',
    });
  }
  if (method === 'ping') return rpcResult(id, {});
  if (method === 'tools/list') return rpcResult(id, { tools: TOOLS });
  if (method === 'tools/call') return relay(msg);
  if (id == null) return null; // unknown notification
  return rpcError(id, -32601, 'Method not found: ' + method);
}

async function handleAny(msg) {
  if (Array.isArray(msg)) {
    const outs = [];
    for (const m of msg) { const r = await handle(m); if (r) outs.push(r); }
    return outs.length ? outs : null;
  }
  return handle(msg);
}

/* ---------- stdio transport (default) ---------- */
function stdioMain() {
  let pending = 0, closed = false;
  const maybeExit = () => { if (closed && pending === 0) process.exit(0); };
  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  rl.on('line', line => {
    line = line.trim();
    if (!line) return;
    let msg;
    try { msg = JSON.parse(line); }
    catch (e) { process.stdout.write(JSON.stringify(rpcError(null, -32700, 'Parse error')) + '\n'); return; }
    pending++;
    handleAny(msg).then(out => {
      if (out) process.stdout.write(JSON.stringify(out) + '\n');
      pending--; maybeExit();
    });
  });
  rl.on('close', () => { closed = true; maybeExit(); });
  console.error('infyicon-mcp: stdio mode, relaying to ' + UPSTREAM);
}

/* ---------- streamable HTTP transport (--http [port]) ---------- */
function httpMain(port) {
  const srv = http.createServer((req, res) => {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
    };
    if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
    if (req.method === 'GET') {
      res.writeHead(405, Object.assign({ 'Content-Type': 'application/json' }, cors));
      return res.end(JSON.stringify(rpcError(null, -32000, 'This MCP server is stateless: use HTTP POST.')));
    }
    if (req.method !== 'POST') { res.writeHead(405, cors); return res.end(); }
    let b = '';
    req.on('data', c => { b += c; if (b.length > 1048576) req.destroy(); });
    req.on('end', () => {
      let msg;
      try { msg = JSON.parse(b); }
      catch (e) {
        res.writeHead(400, Object.assign({ 'Content-Type': 'application/json' }, cors));
        return res.end(JSON.stringify(rpcError(null, -32700, 'Parse error')));
      }
      handleAny(msg).then(out => {
        if (!out) { res.writeHead(202, cors); return res.end(); }
        res.writeHead(200, Object.assign({ 'Content-Type': 'application/json' }, cors));
        res.end(JSON.stringify(out));
      });
    });
  });
  srv.listen(port, () => console.error('infyicon-mcp: http mode at POST http://127.0.0.1:' + port + '/mcp (any path accepted)'));
}

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));

const hi = process.argv.indexOf('--http');
if (hi !== -1) httpMain(parseInt(process.argv[hi + 1], 10) || parseInt(process.env.PORT, 10) || 3000);
else stdioMain();

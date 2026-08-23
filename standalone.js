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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'Content-Length': Buffer.byteLength(body) },
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
  console.error('infyicon-mcp: stdio mode, relaying tools/call to ' + UPSTREAM);
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

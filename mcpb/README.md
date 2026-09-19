# Infyicon — Claude Desktop extension

Search 161,000+ free hand-drawn icons from Claude and paste ready-to-embed SVG or PNG into your work.
This extension is a tiny stdio bridge to the hosted Infyicon MCP endpoint (`https://infyicon.com/mcp`);
it bundles no dependencies and needs no API key or account.

## Install

Double-click `infyicon.mcpb` (Claude Desktop → Settings → Extensions → Install), or build it yourself:

```bash
npx @anthropic-ai/mcpb pack mcpb dist/infyicon.mcpb
```

## Privacy Policy

The extension sends only the tool arguments you (or Claude) supply — search words, icon ids, style filters —
to `https://infyicon.com/mcp` over HTTPS and returns icon metadata, SVG markup and PNG URLs. No account,
sign-in, API key, file access or telemetry is involved; nothing is stored on your machine beyond Claude's own
conversation history. Requests to infyicon.com are handled under the Infyicon privacy policy:
https://infyicon.com/privacy — data collection, usage, storage, third-party sharing, retention and contact
details are all covered there. Contact: info@infyicon.com.

## License

Extension code: MIT. Icons: free for personal and commercial use with attribution to infyicon.com — https://infyicon.com/license

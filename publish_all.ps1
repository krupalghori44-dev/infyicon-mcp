# Infyicon MCP v1.2.0 — the two publishes that need YOUR login (browser windows will open).
# 1) npm (npm login)   2) Official MCP Registry (GitHub login, account krupalghori44-dev)
# npm goes first because server.json now lists the npm package and the registry validates it exists.
$ErrorActionPreference = 'Continue'
Set-Location 'D:\Infyicons\infyicon-mcp-git'
if (-not (Test-Path '.\mcp-publisher.exe')) { Copy-Item 'D:\Infyicons\infyicon-mcp-repo\mcp-publisher.exe' . }

Write-Host "`n=== STEP 1/2  npm package infyicon-mcp ===" -ForegroundColor Cyan
Write-Host "npm login opens a browser page; sign in (or create the free npm account), then come back here." -ForegroundColor Yellow
npm login
npm publish --access public
try { "npm now: infyicon-mcp@" + (Invoke-RestMethod 'https://registry.npmjs.org/infyicon-mcp/latest').version } catch { Write-Host "npm verify later: $_" -ForegroundColor Yellow }

Write-Host "`n=== STEP 2/2  Official MCP Registry ===" -ForegroundColor Cyan
Write-Host "A GitHub device-login page opens; sign in as krupalghori44-dev and approve." -ForegroundColor Yellow
.\mcp-publisher.exe login github
Write-Host "Publishing server.json (v1.2.0) ..." -ForegroundColor Cyan
.\mcp-publisher.exe publish
try { (Invoke-RestMethod 'https://registry.modelcontextprotocol.io/v0.1/servers?search=infyicon').servers | % { "registry now: $($_.server.name) v$($_.server.version)" } } catch { Write-Host "verify later: $_" -ForegroundColor Yellow }

Write-Host "`nPUBLISH_FLOW_DONE - screenshot this window for Claude if anything above shows an error" -ForegroundColor Green
Read-Host 'Press Enter to close'

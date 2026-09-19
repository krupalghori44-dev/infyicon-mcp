# Official MCP Registry publish (v1.2.0, remote-only manifest while npm is down).
Set-Location 'D:\Infyicons\infyicon-mcp-git'
if (-not (Test-Path '.\mcp-publisher.exe')) { Copy-Item 'D:\Infyicons\infyicon-mcp-repo\mcp-publisher.exe' . }
Copy-Item server.json server.full.json -Force
$j = Get-Content server.json -Raw | ConvertFrom-Json
$j.PSObject.Properties.Remove('packages')
$j | ConvertTo-Json -Depth 6 | Set-Content server.json -Encoding UTF8
Write-Host "`nGitHub device login: a code appears below - Claude will open github.com/login/device for you." -ForegroundColor Yellow
.\mcp-publisher.exe login github
Write-Host "`nPublishing v1.2.0 ..." -ForegroundColor Cyan
.\mcp-publisher.exe publish
Copy-Item server.full.json server.json -Force; Remove-Item server.full.json
try { (Invoke-RestMethod 'https://registry.modelcontextprotocol.io/v0.1/servers?search=infyicon').servers | % { "registry now: $($_.server.name) v$($_.server.version)" } } catch { Write-Host "verify later: $_" -ForegroundColor Yellow }
Write-Host "`nREGISTRY_FLOW_DONE" -ForegroundColor Green
Read-Host 'Press Enter to close'

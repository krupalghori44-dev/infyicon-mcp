# Real console window (minimized). No pipes: npm must see a TTY so 2FA publish uses the
# web-auth prompt (URL printed) instead of failing with EOTP. Krupal taps his security key.
Set-Location 'D:\Infyicons\infyicon-mcp-git'
$log = 'D:\Infyicons\infyicon-mcp-git\_npmlogin.log'
$host.UI.RawUI.WindowTitle = 'npm publish infyicon-mcp (do not close)'
Start-Transcript -Path $log -Force | Out-Null
"START $(Get-Date -Format s)"
if (-not (npm whoami 2>$null)) { npm login --auth-type=web --no-browser }
"WHOAMI: $(npm whoami 2>&1)"
npm publish --access public --auth-type=web
Start-Sleep 5
try { "NPM_NOW: infyicon-mcp@" + (Invoke-RestMethod 'https://registry.npmjs.org/infyicon-mcp/latest').version } catch { "NPM_VERIFY_LATER: $_" }
"NPM_FLOW_DONE"
Stop-Transcript | Out-Null
Start-Sleep 3

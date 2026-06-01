$logFile = "$env:TEMP\aijob_tunnel.log"
$urlFile = "$env:TEMP\aijob_tunnel_url.txt"

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
if (Test-Path $logFile) { Remove-Item $logFile -Force }
if (Test-Path $urlFile) { Remove-Item $urlFile -Force }

$p = Start-Process -FilePath cmd `
    -ArgumentList "/c cloudflared tunnel --url http://localhost:3000 > `"$logFile`" 2>&1" `
    -WindowStyle Hidden -PassThru

for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep 1
    if (Test-Path $logFile) {
        $content = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
        if ($content -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
            $url = $Matches[1]
            [System.IO.File]::WriteAllText($urlFile, $url, [System.Text.Encoding]::ASCII)
            Write-Host $url
            exit 0
        }
    }
}

exit 1

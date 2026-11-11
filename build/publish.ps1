# Publica o Agent como executável self-contained (não precisa de .NET instalado na máquina alvo).
# Uso:  powershell -ExecutionPolicy Bypass -File build\publish.ps1
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$proj = Join-Path $repo "src\Agent\Agent.csproj"
$out  = Join-Path $repo "dist\ConvergasControl"

Write-Host "Publicando ConvergasControl Agent (win-x64, self-contained)..." -ForegroundColor Cyan
dotnet publish $proj -c Release -r win-x64 --self-contained `
    -p:PublishSingleFile=false -o $out

Write-Host ""
Write-Host "OK -> $out" -ForegroundColor Green
Write-Host "Agora rode (como Administrador):  build\install-service.ps1"

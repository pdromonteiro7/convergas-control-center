# Instala o ConvergasControl Agent como Serviço do Windows (autostart, LocalSystem/elevado).
# Rode como ADMINISTRADOR:  powershell -ExecutionPolicy Bypass -File build\install-service.ps1
$ErrorActionPreference = "Stop"
$repo = Split-Path -Parent $PSScriptRoot
$exe  = Join-Path $repo "dist\ConvergasControl\ConvergasControl.Agent.exe"
$svc  = "ConvergasControlAgent"

if (-not (Test-Path $exe)) { throw "Publique primeiro: build\publish.ps1  (não achei $exe)" }

# se já existir, para e remove
$existing = Get-Service -Name $svc -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "Serviço já existe — recriando..." -ForegroundColor Yellow
    if ($existing.Status -ne "Stopped") { Stop-Service $svc -Force }
    sc.exe delete $svc | Out-Null
    Start-Sleep -Seconds 1
}

New-Service -Name $svc -BinaryPathName "`"$exe`"" -DisplayName "ConvergasControl Agent" `
    -Description "Executa Skills, monitora a máquina e serve a UI local (127.0.0.1:8765)." `
    -StartupType Automatic | Out-Null

Start-Service $svc
Write-Host "Serviço '$svc' instalado e iniciado." -ForegroundColor Green
Write-Host "Abra a UI:  http://127.0.0.1:8765"

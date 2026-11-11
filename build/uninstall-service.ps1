# Remove o Serviço do Windows do ConvergasControl Agent.
# Rode como ADMINISTRADOR:  powershell -ExecutionPolicy Bypass -File build\uninstall-service.ps1
$ErrorActionPreference = "Stop"
$svc = "ConvergasControlAgent"
$existing = Get-Service -Name $svc -ErrorAction SilentlyContinue
if (-not $existing) { Write-Host "Serviço não instalado."; return }
if ($existing.Status -ne "Stopped") { Stop-Service $svc -Force }
sc.exe delete $svc | Out-Null
Write-Host "Serviço '$svc' removido." -ForegroundColor Green

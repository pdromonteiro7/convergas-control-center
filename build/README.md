# Empacotamento / Instalação — ConvergasControl

Transforma o Agent num **executável instalável** que roda como **Serviço do Windows**
(autostart, em segundo plano, elevado). Não precisa de .NET nem de Rust na máquina alvo —
o publish é **self-contained** (leva o runtime junto).

## Passos

```powershell
# 1) publicar o .exe (self-contained win-x64)
powershell -ExecutionPolicy Bypass -File build\publish.ps1
#    -> gera dist\ConvergasControl\ConvergasControl.Agent.exe

# 2) instalar como Serviço do Windows (rode como ADMINISTRADOR)
powershell -ExecutionPolicy Bypass -File build\install-service.ps1

# 3) abrir a UI
start http://127.0.0.1:8765
```

Para remover:

```powershell
powershell -ExecutionPolicy Bypass -File build\uninstall-service.ps1
```

## O que acontece
- O Serviço `ConvergasControlAgent` sobe no boot, executa Skills, monitora a máquina e
  serve a UI em `http://127.0.0.1:8765`.
- Como Serviço roda **elevado** (LocalSystem) → Skills de admin (SFC, DISM, spooler,
  bloqueio, etc.) funcionam **sem UAC**.

## Distribuir na frota (26 máquinas)
Copie a pasta `dist\ConvergasControl` + a pasta `build` para a máquina e rode os 2 comandos,
ou empurre via **GPO/PsExec**. Um atalho no Menu Iniciar para `http://127.0.0.1:8765`
completa a experiência de "app".

## Caveats (sessão 0)
Rodando como Serviço (sessão 0), recursos **por-usuário** têm nuances:
- **Wallpaper**: precisa aplicar no HKCU do usuário logado (hoje funciona rodando na sessão do usuário).
- **Monitoramento ETW** e **bloqueio (registro HKLM + hosts)**: funcionam como Serviço elevado. ✔

## Próximo passo (opcional, custo ~US$100–400/ano)
Assinatura de código (cert) para o Windows não mostrar "editor desconhecido". Desnecessário
para uso interno — pode auto-assinar de graça e confiar via GPO.

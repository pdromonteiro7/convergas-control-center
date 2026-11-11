# Vocabulário de Capacidades — ConvergasControl Agent

> **Capacidade** = bloco de execução **compilado, revisado e assinado** dentro de
> `Agent.Capabilities`. É a **única** coisa que toca o Windows. Uma [Skill](../skills/)
> (dado JSON) só pode referenciar capacidades **desta lista** — nunca texto de comando livre.
>
> Adicionar/alterar capacidade = **novo release assinado do Agent** (revisão de código).
> Adicionar Skill que só recombina capacidades existentes = **só publicar um JSON assinado**.

Legenda: **admin** = exige elevação · **stream** = longa duração, emite progresso ao vivo ·
**read** = só leitura, não altera o sistema.

---

## probe.* — leitura / diagnóstico (nunca alteram o sistema)

### `probe.systemInfo` · read
Edição, versão e build do Windows, hostname, uptime, arquitetura.
- **params:** —
- **retorna:** `{ edition, version, build, hostname, uptimeSec, arch }`
- **mecanismo:** WMI (`Win32_OperatingSystem`) / API nativa. Equivale ao `winver`.
- **erros:** `probe.unavailable`

### `probe.listProcesses` · read
Processos em execução com PID e memória.
- **params:** `{ filter?: string, top?: int }`
- **retorna:** `{ processes: [{ name, pid, memMB }], total }`
- **mecanismo:** enumeração de processos (.NET `Process`). Equivale ao `tasklist`.
- **erros:** `probe.unavailable`

### `probe.getIpConfig` · read
Configuração de rede de todas as interfaces.
- **params:** —
- **retorna:** `{ interfaces: [{ name, ipv4, mask, gateway, dns[], mac, dhcp }] }`
- **mecanismo:** `NetworkInterface.GetAllNetworkInterfaces()`. Equivale ao `ipconfig /all`.
- **erros:** `probe.unavailable`

### `probe.healthSnapshot` · read
Fotografia de saúde do computador (**base da área "Saúde do PC" — Fase 3**).
- **params:** —
- **retorna:** `{ cpuPct, ram:{usedMB,totalMB}, disks:[{drive,freeGB,totalGB}], net:{upKbps,downKbps} }`
- **mecanismo:** PerformanceCounter / WMI. Amostrado periodicamente pelo Agent.
- **erros:** `probe.unavailable`

---

## network.* — rede

### `network.flushDns` · —
Limpa o cache de resolução DNS.
- **params:** — · **retorna:** `{ ok }` · **mecanismo:** `DnsFlushResolverCache` (dnsapi) / `ipconfig /flushdns`.
- **erros:** `network.flushFailed`

### `network.renewIp` · —
Libera e renova o IP via DHCP.
- **params:** `{ interface?: string }` · **retorna:** `{ ok, newIp }`
- **mecanismo:** DHCP release+renew. Equivale a `ipconfig /release && /renew`.
- **erros:** `network.noDhcp`, `network.renewFailed`

### `network.winsockReset` · admin
Restaura o catálogo Winsock ao padrão. **Exige reinício.**
- **params:** — · **retorna:** `{ ok, rebootRequired: true }`
- **mecanismo:** `netsh winsock reset` (API equivalente).
- **erros:** `network.resetFailed`

### `network.ping` · read
Testa conectividade com N pacotes **finitos** (a versão Skill NÃO é contínua como `ping -t`).
- **params:** `{ target: string, count?: int = 4 }`
- **retorna:** `{ sent, received, lostPct, minMs, avgMs, maxMs }`
- **mecanismo:** `System.Net.NetworkInformation.Ping`.
- **erros:** `network.unreachable`, `network.dnsFail`

---

## system.* — sistema operacional

### `system.sfcScan` · admin · stream
Verifica e repara arquivos protegidos do Windows.
- **params:** — · **retorna:** `{ result: 'healthy'|'repaired'|'unrepairable' }`
- **mecanismo:** `sfc /scannow` com captura de progresso. **5–20 min.**
- **erros:** `system.sfcUnrepairable` (→ sugerir `system.dismRestoreHealth`)

### `system.dismRestoreHealth` · admin · stream
Repara a imagem base de componentes do Windows (precisa de internet).
- **params:** — · **retorna:** `{ result: 'ok'|'failed' }`
- **mecanismo:** `DISM /Online /Cleanup-Image /RestoreHealth`.
- **erros:** `system.noInternet`, `system.dismFailed`

### `system.chkdsk` · admin
Verifica sistema de arquivos e superfície do disco. Se o volume estiver em uso (ex.: `C:`),
**agenda no próximo boot**.
- **params:** `{ drive?: string = 'C:', fix?: bool = true, scanSectors?: bool = true }`
- **retorna:** `{ result: 'completed'|'scheduledOnReboot' }`
- **mecanismo:** `chkdsk` (`/f /r`).
- **erros:** `system.chkdskFailed`

### `system.rebootPrompt` · —
Solicita ao usuário reiniciar (usado por Skills que exigem reboot).
- **params:** `{ reason: string, delaySeconds?: int = 0 }`
- **retorna:** `{ accepted: bool }`
- **erros:** —

---

## service.* — serviços do Windows

### `service.restart` · admin
Reinicia um serviço **da whitelist** (não aceita nome arbitrário).
- **params:** `{ serviceName: enum['Spooler', ...] }`
- **retorna:** `{ ok, state: 'running' }`
- **mecanismo:** `ServiceController` stop+start. Ex.: Spooler = fila de impressão.
- **erros:** `service.notWhitelisted`, `service.restartFailed`

---

## office.* — Microsoft 365

### `office.repair` · —
Repara a instalação do Microsoft 365.
- **params:** `{ mode?: 'quick'|'online' = 'quick' }`
- **retorna:** `{ ok }`
- **mecanismo:** `OfficeC2RClient.exe`. **Nota:** o comando original do site era um *update*
  (`/update user`); a capacidade real expõe o **reparo** (quick/offline e online). O update
  vira uma capacidade separada `office.update` se for necessário.
- **erros:** `office.notInstalled`, `office.repairFailed`

---

## policy.* — políticas de grupo

### `policy.gpUpdate` · —
Força a aplicação das políticas de grupo/domínio.
- **params:** `{ force?: bool = true }`
- **retorna:** `{ ok, logoffRequired?: bool, rebootRequired?: bool }`
- **mecanismo:** `gpupdate /force`.
- **erros:** `policy.updateFailed`

---

## Códigos de erro comuns (transversais)

| Código | Significado |
|---|---|
| `denied` | Faltou elevação (Skill `requiresAdmin` sem privilégio) |
| `timeout` | Capacidade excedeu o tempo máximo |
| `cancelled` | Usuário cancelou durante o stream |
| `unexpected` | Falha não mapeada (vai para o log de auditoria) |

> Cada Skill mapeia esses códigos para mensagens humanas no campo `onError` do seu manifesto.

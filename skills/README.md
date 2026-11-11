# Catálogo de Skills — ConvergasControl

Cada arquivo `*.json` aqui é uma **Skill**: um manifesto **declarativo** que descreve uma
ação que o usuário pode **Executar** (não mais "copiar comando"). A Skill é **dado**, não
código — ela só referencia [capacidades](../docs/CAPACIDADES.md) compiladas no Agent.

## Formato

```jsonc
{
  "id": "net.flush-dns",          // único, kebab-case, namespaced por área
  "name": "Limpar Cache DNS",     // rótulo exibido
  "category": "Rede",             // Rede | Sistema | Diagnóstico | Office
  "icon": "globe",                // nome do ícone (js/icons.js)
  "description": "…",             // o que faz + quando usar
  "requiresAdmin": false,         // exige elevação?
  "estimatedSeconds": 5,          // tempo estimado (UI mostra)
  "steps": [                      // sequência de capacidades (nunca comando cru)
    { "capability": "network.flushDns", "params": {} }
  ],
  "expected": "Cache DNS limpo com sucesso.",   // retorno esperado (mensagem de sucesso)
  "onError": {                    // código de erro da capacidade → mensagem humana
    "network.flushFailed": "Não foi possível limpar o cache DNS.",
    "default": "Falha ao limpar o cache DNS. Veja o log."
  }
}
```

## Regras

- `steps[].capability` **deve** existir em `docs/CAPACIDADES.md`. Um id desconhecido é rejeitado.
- `steps[].params` é **tipado e validado** contra a assinatura da capacidade.
- Se **qualquer** step tem capacidade `admin`, a Skill **deve** ter `requiresAdmin: true`.
- No futuro (Fase 5) cada manifesto recebe um campo `signature`; o Agent rejeita manifesto
  não assinado ou adulterado. Enquanto local (Fases 0–3), rodamos sem assinatura.

## Origem

Extraídos dos 13 comandos do antigo *Command Center* (`js/store.js`, `cm1`–`cm13`).
Mapa completo em `docs/CAPACIDADES.md`.

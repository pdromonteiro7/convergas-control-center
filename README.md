# Convergas · IT Ops Center

Painel administrativo interno de TI — *single source of truth* da infraestrutura da Convergas.
Uso individual (1 administrador), sem autenticação no MVP, **100% front-end estático**.

## Stack
HTML + CSS + JavaScript puro (sem build, sem dependências). Dados em `localStorage`
(seed JSON em `js/store.js`). Fontes Google: Barlow Condensed + DM Sans.
Design alinhado ao **Convergas Brand Guideline** (dark/light, accent ciano `#5CE1E6`).

## Estrutura
```
index.html        # shell: sidebar + topbar + view root
css/styles.css    # design system (tokens dark/light, componentes)
js/icons.js       # set de ícones SVG inline
js/store.js       # store localStorage + dados de exemplo
js/app.js         # router, páginas, modais, formulários, busca
assets/           # logos da marca
vercel.json       # headers de segurança / deploy
```

## Módulos
Dashboard · Equipe · Computadores · Impressoras · Command Center · Runbooks ·
Domínio & Infra · Inventário · Settings.

## Rodar
Abrir `index.html` no navegador, ou servir a pasta:
```
npx serve .
```

## Princípios
- Orientado a ação: copiar, abrir, visualizar.
- **Nunca executa comandos** — apenas copia e orienta.
- Rápido, leve, sem backend.

Atalhos: `/` foca a busca global · `Esc` fecha modais.

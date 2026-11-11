# Convergas Control Center — instruções para o Claude

## Deploy (regra fixa)
- **Sempre publicar na Vercel ao terminar qualquer mudança.** O projeto da Vercel está ligado a este repositório: push no `main` = deploy de produção automático.
- Fluxo: commit → `git push origin main` (ou merge do branch de trabalho no `main` e push) → aguardar o status "Vercel" do commit ficar `success` (`gh api repos/pdromonteiro7/convergas-control-center/commits/<sha>/status`) → informar o link ao usuário.
- Se o deploy falhar, avisar o usuário com o motivo; nunca dizer que publicou sem o status `success`.

## Projeto
- Front-end estático (HTML + CSS + JS puro, sem build). Dados em `localStorage` com sincronização Supabase (`js/cloud.js`, coleções em `ENTITY_COLLECTIONS`).
- `js/app.js`: router, páginas (`PAGES[...]`), menus por área (`NAV`), Home (seletor orbital `HOME_AREAS`).
- `css/styles.css`: base. `css/theme.css`: camada de design atual ("Obsidian") — mudanças visuais vão aqui.
- Pós-Vendas (IATF 16949 / ISO 9001): bloco `PÓS-VENDAS` em `js/app.js`, rotas `pv-*`, coleções `pvChamados` e `pvClientes`.
- Testar no navegador (Playwright) em desktop, celular e tema claro antes de publicar.
- Textos da interface em português do Brasil.

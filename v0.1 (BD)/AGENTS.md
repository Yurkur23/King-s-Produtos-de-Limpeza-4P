# Kings Produtos de Limpeza

PWA acadêmica em React 19, TypeScript, Vite e Tailwind CSS 4, com API Express e PostgreSQL 17. Node.js 24 LTS e npm são a referência; use o package-lock.json.

## Arquivos principais

- `src/App.tsx`: telas do protótipo Figma conectadas a callbacks assíncronos.
- `src/types.ts` e `src/api.ts`: contratos e cliente HTTP.
- `server/app.mjs`: rotas, autenticação, CSRF, perfis e validação.
- `server/store.mjs`: transações de pedidos, reservas, estoque e relatórios.
- `server/security.mjs`: senhas scrypt e sessões.
- `database/migrations/`: migrações versionadas; nunca altere uma migração já aplicada.
- `scripts/build-sw.mjs`: geração do service worker; não armazene respostas da API em cache.
- `docs/`: modelo de dados, API e cobertura dos requisitos.

## Execução e verificação

- `docker compose up --build -d --wait` inicia aplicação e PostgreSQL.
- `npm run dev` inicia API e Vite com DATABASE_URL configurada.
- `npm run build` confere TypeScript e gera a PWA.
- `npm test` exige TEST_DATABASE_URL e executa testes em schema isolado.
- `npm run test:e2e` exige build, Chromium do Playwright e banco próprio de demonstração.

## Regras de implementação

- Preserve o visual do protótipo e o catálogo original.
- Autorize operações no servidor, independentemente dos controles visuais.
- Nunca aceite preço, total, perfil administrativo ou confirmação real de pagamento vindos livremente do cliente.
- Use um único cliente PostgreSQL em cada transação; trave produtos em ordem de ID.
- Preserve idempotência e histórico de estoque/pedidos.
- Não exponha hash de senha ou token bruto de sessão em respostas de usuário.
- O modo mock é demonstração explícita; não apresente cobrança fictícia como real.

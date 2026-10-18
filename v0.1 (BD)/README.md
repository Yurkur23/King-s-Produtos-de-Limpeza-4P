# Kings Produtos de Limpeza

PWA acadêmica baseada no protótipo React/Figma enviado. O catálogo e o visual foram preservados; os dados que existiam apenas na memória agora são persistidos em **PostgreSQL**, por meio de uma API Node.js/Express.

## Executar no Windows com Docker

Instale o Docker Desktop com suporte a contêineres Linux e abra-o. Extraia este projeto, abra o PowerShell **na pasta que contém `compose.yaml`** e execute:

```powershell
Copy-Item .env.example .env
docker compose up --build -d --wait
```

Acesse **http://localhost:8080**. A primeira execução baixa imagens, instala dependências, cria as tabelas e carrega o catálogo e as contas de teste. Não é necessário instalar Node.js ou PostgreSQL no Windows nesta opção.

| Perfil | E-mail | Senha de demonstração |
| --- | --- | --- |
| Administrador | admin@kings.com.br | admin123 |
| Funcionário | funcionario@kings.com.br | func123 |
| Cliente | cliente@email.com | cliente123 |

Também é possível cadastrar novos clientes pela tela de login. O cadastro público sempre cria um cliente; permissões administrativas são verificadas pela API.

Comandos úteis:

```powershell
docker compose logs -f app
docker compose ps
docker compose down
docker compose up -d
```

`down` encerra os serviços e preserva o banco no volume `kings_postgres`. Os dados persistem ao reiniciar e reconstruir a aplicação. Os dados demonstrativos não sobrescrevem registros existentes.

As portas são locais: aplicação 8080 e PostgreSQL 5432. Se houver conflito, altere `APP_PORT` e/ou `POSTGRES_PORT` no `.env`. Ao mudar `APP_PORT`, ajuste `DOCKER_APP_ORIGIN` para a mesma URL utilizada no navegador. Senhas com caracteres reservados precisam de codificação de URL em `DATABASE_URL`.

## O que está funcionando

- Cadastro e login, senhas com scrypt, sessões persistidas no PostgreSQL e cookie HttpOnly.
- Perfis de cliente, funcionário e administrador com autorização no servidor, validação de origem e proteção CSRF.
- Catálogo com as 14 imagens/produtos do protótipo, pesquisa, categorias e ocultação de produtos desativados.
- Carrinho persistente por usuário; alterações e checkout validam o estoque atual no banco.
- Checkout com os dados de entrega preenchidos, histórico de pedidos por ID do cliente e cópia dos preços/dados dos produtos no momento da compra.
- Pagamento **demonstrativo** por Pix/cartão, reserva de estoque, confirmação, cancelamento e expiração.
- Cadastro, edição, desativação e reativação de produtos; código de barras único; entrada e alerta de estoque.
- Mini-PDV com busca manual e leitura por scanner que funciona como teclado e envia Enter. A conclusão registra o pagamento informado como já recebido no balcão.
- Baixa de estoque transacional e prevenção de venda da mesma unidade em compras concorrentes.
- Relatório mensal de vendas pagas, valores totais, ticket médio e produtos mais vendidos.
- Manifesto, ícones e service worker de PWA. A interface pode abrir offline após a primeira visita; consultas e gravações exigem conexão.
- Testes de API com PostgreSQL e testes de navegador com Playwright; workflow de CI no GitHub.

## Roteiro rápido de demonstração

1. Entre como cliente, adicione um produto e atualize a página. O carrinho continua salvo.
2. Finalize a compra com dados de entrega válidos. O pedido fica **Aguardando Pagamento**.
3. Abra **Meus Pedidos → Simular pagamento**. O pedido fica **Confirmado**, com baixa de estoque.
4. Entre como administrador. Em **Pedidos**, avance para **Em Separação → Enviado → Entregue**.
5. Em **Estoque**, registre uma entrada. A quantidade disponível e os alertas são atualizados.
6. Em **Relatórios**, escolha o mês da confirmação do pagamento.
7. Entre como funcionário e use o código `7898615710101` seguido de Enter no PDV. Confirme somente depois de receber o pagamento no balcão.

## Pagamentos e regras de estoque

Este projeto é um ambiente de demonstração: **não cobra dinheiro, não gera Pix válido e não coleta número de cartão nem CVV**. O botão “Simular pagamento” é uma operação de teste e só funciona com `PAYMENT_MODE=mock`.

O RF08 do documento original pede um serviço de pagamentos integrado. Esse requisito fica **parcialmente atendido**: método, situação e confirmação estão implementados; o provedor real e seus webhooks ainda precisam ser integrados. Com `PAYMENT_MODE=disabled`, novos pedidos online e a confirmação demonstrativa ficam bloqueados. Não existe confirmação fictícia apresentada como cobrança real.

Um pedido online reserva unidades por **30 minutos**. O estoque exibido no catálogo é `stock - reserved_stock`. A confirmação retira as unidades do estoque físico e libera a reserva na mesma transação. Um cancelamento sem pagamento ou a expiração apenas libera a reserva. A API confere o prazo também na confirmação; a rotina de expiração roda ao iniciar e a cada minuto enquanto a API está ativa. Pode haver até um minuto de atraso na liberação automática. Com a API desligada, a limpeza ocorre na próxima inicialização.

Vendas presenciais são registradas como pagas e entregues e baixam estoque imediatamente. O PDV não se comunica com uma maquininha ou instituição financeira.

Operações de venda usam transações, travas de linha e uma chave `Idempotency-Key` para que a repetição da mesma requisição não crie outra venda. O servidor calcula o valor a partir do cadastro e mantém um snapshot no item do pedido; mudanças futuras no produto não alteram compras anteriores. Cancelamentos de pedidos já pagos, estornos, frete real, emissão fiscal, e-mails e recuperação de senha não fazem parte desta entrega.

## Desenvolvimento com Node.js

Use **Node.js 24 LTS** (mínimo 22.12) e npm. Você pode usar Docker apenas para o banco:

```powershell
Copy-Item .env.example .env
docker compose up db -d --wait
npm ci
npm run dev
```

Abra **http://localhost:5173**. O Vite encaminha `/api` para o servidor na porta 3001. A API aplica as migrações e, se `SEED_DEMO=true`, o seed na inicialização.

Para usar PostgreSQL instalado diretamente, crie um banco vazio e ajuste `DATABASE_URL`. PostgreSQL 17 é a versão de referência. Não é obrigatório usar Docker.

```powershell
npm run db:migrate
npm run db:seed
npm run dev
```

`db:seed` é uma carga de **demonstração** executada explicitamente; não depende de `SEED_DEMO`. Na inicialização automática, o seed só roda com essa variável em `true`.

Para testar o build com a API servindo os arquivos da PWA:

```powershell
npm run build
$env:APP_ORIGIN="http://localhost:3001"
npm start
```

Abra **http://localhost:3001**. `npm run preview` serve somente os arquivos estáticos; use `npm start` para testar a solução completa.

## PWA

A instalação está disponível no build de produção, servido por `npm start` ou Docker. Use a opção “Instalar aplicativo” do navegador compatível. O funcionamento depende de HTTPS ou de `localhost`. O servidor de desenvolvimento não registra o service worker.

O cache guarda apenas os arquivos públicos da interface e as imagens locais. Respostas de `/api`, cookies, carrinhos e pedidos não são gravados no Cache Storage. Offline não permite novas compras nem enfileira vendas para sincronização. Fontes externas usam a fonte de sistema se estiverem indisponíveis.

A instalação e os recursos disponíveis variam por navegador. Testes em celular por IP da rede requerem uma configuração HTTPS e exposição da porta; a configuração fornecida está restrita ao próprio computador.

## GitHub e testes

Extraia o ZIP e envie **o conteúdo da pasta do projeto** ao seu repositório, incluindo `.github/workflows/ci.yml`, `.env.example` e `package-lock.json`. Não envie `.env`, `node_modules` ou arquivos de dados do PostgreSQL. Nenhum repositório ou deploy foi criado automaticamente.

No GitHub, a aba **Actions → Testes Kings** executa dois trabalhos em pushes e pull requests:

1. Compilação TypeScript/Vite, testes da API com PostgreSQL 17 e testes de navegador com Chromium.
2. Build e inicialização da aplicação completa com Docker Compose e verificação de saúde.

**GitHub Pages sozinho não executa a API Node.js nem hospeda PostgreSQL.** Para usar o sistema completo, rode localmente, em Codespaces com Docker disponível ou em uma hospedagem que execute a API e tenha PostgreSQL. O workflow de CI valida o projeto; ele não publica um site.

### Testes de API localmente

Use um banco próprio para testes, ao qual o usuário tenha permissão de criar schemas. Cada execução usa e remove um schema exclusivo; as tabelas do schema padrão não são truncadas pelos testes.

```powershell
$env:TEST_DATABASE_URL="postgresql://kings:kings_dev_password@localhost:5432/kings"
npm test
```

Os testes falham com uma instrução de configuração se `TEST_DATABASE_URL` não estiver definida; não há substituição por um banco em memória. Eles cobrem autorização, sessão, CSRF, isolamento de clientes, persistência do carrinho, total calculado no servidor, reserva, confirmação repetida, cancelamento, expiração, concorrência, rollback, snapshots, relatórios e histórico de estoque.

### Testes no navegador

```powershell
npm run build
npx playwright install chromium
$env:DATABASE_URL="postgresql://kings:kings_dev_password@localhost:5432/kings"
$env:APP_ORIGIN="http://127.0.0.1:3080"
npm run test:e2e
```

O Playwright inicia uma aplicação de demonstração na porta 3080. Esses testes **criam pedidos, movimentam estoque e cadastram produtos**; use um banco separado de qualquer dado importante. Cada teste de cadastro usa um código único. A PWA é testada offline no build de produção.

## Estrutura

| Caminho | Conteúdo |
| --- | --- |
| `src/` | Telas React preservadas e integradas à API, tipos e cliente HTTP |
| `server/` | API, autenticação, regras de vendas/estoque, migrações e seed |
| `database/migrations/` | SQL versionado, chaves, índices, restrições e triggers |
| `database/products.json` | Catálogo original utilizado na carga de demonstração |
| `public/` | Imagens, manifesto e ícones; service worker é gerado no build |
| `docs/BANCO_DE_DADOS.md` | Modelo, relacionamentos e regras de integridade |
| `docs/API.md` | Rotas, autenticação e exemplos de requisição |
| `docs/REQUISITOS.md` | Correspondência com os requisitos enviados |
| `docs/VALIDACAO.md` | Resultado dos testes e limites da validação desta entrega |
| `tests/` | Testes reais da API e testes de interface |
| `compose.yaml`, `Dockerfile` | Execução conjunta da aplicação e PostgreSQL |
| `.github/workflows/ci.yml` | Validação automática no GitHub |

## Contas sem dados de demonstração

Com `SEED_DEMO=false`, as migrações continuam criando as categorias, mas não criam usuários nem produtos fictícios. Depois de aplicar as migrações, crie a primeira conta por linha de comando:

```powershell
npm run user:create -- --name "Administrador" --email "admin@example.com" --role admin
```

O comando gera uma senha aleatória e a mostra uma vez no terminal. No Docker:

```powershell
docker compose exec app npm run user:create -- --name "Administrador" --email "admin@example.com" --role admin
```

Desativar o seed não apaga as contas demonstrativas já existentes. Para uma implantação real, utilize um banco novo, credenciais próprias e HTTPS com `COOKIE_SECURE=true`. O modo de pagamentos reais ainda requer implementação. A configuração de demonstração foi preparada para testes locais da faculdade.

## Referências técnicas

- [PostgreSQL: travas e concorrência](https://www.postgresql.org/docs/17/explicit-locking.html)
- [node-postgres: transações no mesmo cliente](https://node-postgres.com/features/transactions)
- [Docker Compose: ordem de inicialização e health checks](https://docs.docker.com/compose/how-tos/startup-order/)
- [MDN: manifesto de PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest)

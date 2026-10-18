# API HTTP

Em Docker, a base é `http://localhost:8080/api`. Em desenvolvimento, use `http://localhost:5173/api` pelo proxy do Vite. A API responde JSON, usa consultas parametrizadas e retorna mensagens em português. Todas as respostas da API têm `Cache-Control: no-store`.

## Autenticação

Envie `POST /auth/login` com `{ "email": "...", "password": "..." }`. A resposta contém `{user, csrfToken}` e define o cookie `kings_session` como HttpOnly. Mantenha o cookie no cliente; não há JWT no localStorage.

Em `GET /auth/session`, uma sessão ativa retorna o usuário e o token CSRF. Sem sessão, retorna `{user:null, csrfToken:null}`. Em mutações autenticadas, envie `X-CSRF-Token` com esse token, `Content-Type: application/json` e o cookie da sessão. O navegador faz isso pelo cliente `src/api.ts`.

Quando presente, `Origin` deve coincidir exatamente com `APP_ORIGIN` (protocolo, host e porta). Acesso pelo navegador deve utilizar a mesma origem que serve o frontend. A API não habilita CORS aberto.

Login/cadastro têm limite de tentativas. O cadastro público rejeita `role`, preços e outros campos desconhecidos em vez de confiar nos dados do navegador. As senhas são derivadas com scrypt e salt aleatório. O banco guarda somente o hash do token da sessão.

## Rotas

Os caminhos abaixo são relativos a `/api`.

| Método | Rota | Acesso | Finalidade |
| --- | --- | --- | --- |
| GET | `/health` | Público | Conexão PostgreSQL e estado da API |
| GET | `/config` | Público | Modo de pagamento e demonstração |
| GET | `/auth/session` | Público | Recupera a sessão atual |
| POST | `/auth/register` | Público | Cria cliente |
| POST | `/auth/login` | Público | Autentica e cria sessão |
| POST | `/auth/logout` | Autenticado + CSRF | Revoga a sessão |
| GET | `/categories` | Público | Lista categorias |
| GET | `/products` | Público | Produtos ativos; aceita `q` e `category` |
| GET | `/products?includeInactive=true` | Admin | Inclui produtos desativados |
| POST | `/products` | Admin + CSRF | Cria produto com estoque inicial |
| PATCH | `/products/:id` | Admin + CSRF | Atualiza cadastro, preço e ativação |
| GET | `/cart` | Cliente/admin | Carrinho próprio |
| PUT | `/cart/items/:id` | Cliente/admin + CSRF | Define quantidade; 0 remove |
| GET | `/orders` | Autenticado | Cliente vê os próprios; equipe vê os pedidos |
| GET | `/orders/:code` | Autenticado | Detalhes; cliente só vê os próprios |
| POST | `/orders` | Cliente/admin + CSRF | Cria pedido a partir do carrinho |
| POST | `/orders/:code/payments/mock-confirm` | Dono/admin + CSRF | Simula pagamento, se modo mock |
| POST | `/orders/:code/cancel` | Dono/admin + CSRF | Cancela pedido sem pagamento |
| PATCH | `/orders/:code/status` | Funcionário/admin + CSRF | Avança status logístico após pagamento |
| POST | `/pdv/sales` | Funcionário/admin + CSRF | Registra venda recebida no balcão |
| POST | `/inventory/:id/receipts` | Admin + CSRF | Registra entrada de estoque |
| GET | `/inventory/low-stock` | Admin | Produtos ativos no limite ou abaixo do mínimo |
| GET | `/inventory/movements` | Admin | Histórico; `productId`, `limit` (até 200) e `offset` |
| GET | `/reports/sales?from=AAAA-MM-DD&to=AAAA-MM-DD` | Admin | Vendas pagas e ranking no período inclusivo |
| GET | `/users` | Admin | Lista usuários sem hashes |
| POST | `/users` | Admin + CSRF | Cria conta e define perfil; pode criar funcionário |

O identificador `:id` de produtos é inteiro. `:code` é o código público retornado pelo pedido, por exemplo `KNG-0123456789ABCDEF`. O UUID interno também é devolvido em `databaseId` para fins de consulta e relacionamento, mas as rotas de pedido usam o código.

## Exemplos de corpos JSON

Cadastro de cliente:

```json
{"name":"Cliente de Teste","email":"cliente@example.com","phone":"11999999999","password":"umaSenhaDeTeste"}
```

Atualização do carrinho (`PUT /cart/items/1`):

```json
{"quantity":2}
```

Pedido online (`POST /orders`):

```json
{
  "payment":"Pix",
  "address":{
    "name":"Cliente de Teste",
    "email":"cliente@example.com",
    "phone":"11999999999",
    "cep":"01310-100",
    "street":"Av. Paulista",
    "number":"1000",
    "complement":"",
    "city":"São Paulo",
    "state":"SP"
  }
}
```

Envie também um UUID no header `Idempotency-Key`, por exemplo o resultado de `crypto.randomUUID()`. Reutilize a chave na repetição da mesma operação após falha de rede. Gere outra para um novo pedido. O carrinho é lido do banco; o corpo não recebe produtos ou valor total.

Venda presencial (`POST /pdv/sales`, com o mesmo mecanismo de chave idempotente):

```json
{"payment":"Cartão","items":[{"productId":1,"quantity":2},{"productId":8,"quantity":1}]}
```

Cada produto deve aparecer uma única vez; quantidade inteira de 1 a 999. Enviar preço, total, perfil ou campos não previstos retorna erro de validação.

Produto (`POST /products`):

```json
{
  "brand":"KINGS",
  "name":"Limpador multiuso",
  "description":"Descrição do produto",
  "specs":["Uso geral"],
  "volume":"1L",
  "price":19.90,
  "category":"Limpeza Geral",
  "stock":10,
  "minStock":3,
  "barcode":"0000000000001",
  "image":"/icons/icon-192.png",
  "active":true
}
```

`PATCH /products/:id` recebe o cadastro completo editável, com os mesmos campos **exceto `stock`**. Estoque não é sobrescrito pela edição de preço ou nome; use a rota de entrada. `image` aceita um arquivo público em `/products/` ou `/icons/` ou uma URL HTTPS. Não há upload de imagens nesta versão. As três categorias são cadastradas pelas migrações; acrescentar uma categoria requer atualizar o enum da aplicação.

Entrada (`POST /inventory/1/receipts`):

```json
{"quantity":5,"reason":"Reposição do fornecedor"}
```

Avanço (`PATCH /orders/:code/status`):

```json
{"status":"Em Separação"}
```

Sequência aceita: `Confirmado → Em Separação → Enviado → Entregue`. Este endpoint não confirma o pagamento. Para confirmar no ambiente mock, use a rota específica; cancelamentos de pedidos pagos não são aceitos nesta versão.

## Convenções de resposta

- Preços e totais em JSON usam reais como número; no banco, centavos inteiros.
- `Product.stock` representa disponibilidade; `physicalStock` e `reservedStock` mostram os componentes.
- `Order.id` é o código público, `userId` é o proprietário/operador e `channel` identifica `online`/`pdv`.
- `paymentStatus` usa `pending`, `paid`, `cancelled` ou `expired`.
- `paymentProvider` usa `mock` para simulação ou `pos` para recebimento externo no balcão.
- Relatórios consideram `paid_at`, em `America/Sao_Paulo`, e retornam apenas vendas pagas.
- Lista de pedidos e relatório são completos no escopo acadêmico, sem paginação; grande volume exige paginação e limites adicionais.

## Erros

| Código | Significado |
| --- | --- |
| 400 | JSON/campos inválidos, data inválida ou ausência de chave idempotente |
| 401 | Sessão ausente, expirada ou credenciais incorretas |
| 403 | Perfil sem permissão, origem divergente ou CSRF inválido |
| 404 | Produto/pedido ausente ou pedido de outro cliente |
| 409 | Estoque insuficiente, duplicidade ou transição não permitida |
| 413 | Corpo acima de 128 KB |
| 415 | Corpo não enviado como JSON |
| 429 | Limite de requisições/tentativas atingido |
| 503 | Pagamento online desabilitado |

O corpo contém `{ "error": "mensagem" }`. Falhas de validação também incluem `details` com campo e mensagem. Erros internos não expõem SQL, hashes ou credenciais na resposta.

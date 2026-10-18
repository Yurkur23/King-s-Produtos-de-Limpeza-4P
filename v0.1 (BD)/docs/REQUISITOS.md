# Correspondência com os requisitos enviados

Referência: documento de requisitos incluído no ZIP original, preservado em `src/imports/DocumentodeRequisitos7.pdf`.

| Requisito | Implementação | Situação |
| --- | --- | --- |
| RF01 Cadastro | Formulário e `POST /api/auth/register`, com persistência | Atendido |
| RF02 Login | Sessão em PostgreSQL, cookie HttpOnly e perfis | Atendido |
| RF03 Catálogo | Produtos/imagens do protótipo, estoque atual | Atendido |
| RF04 Busca | Busca por nome na interface; nome, marca e barcode na API | Atendido com busca textual simples, sem busca fonética |
| RF05 Categoria | Filtros para as categorias do protótipo | Atendido |
| RF06 Carrinho | Itens por usuário e quantidades persistentes | Atendido |
| RF07 Finalização | Validação, dados de entrega e pedido transacional | Atendido |
| RF08 Pagamento | Pix/cartão demonstrativos, estado e confirmação | Parcial: falta provedor real/webhook |
| RF09 Pedidos | Histórico e detalhes, filtrados por ID do cliente no servidor | Atendido |
| RF10 Produtos | Cadastro, alteração, desativação e reativação pelo admin | Atendido |
| RF11 Estoque | Físico, reservado e disponível, com histórico | Atendido |
| RF12 Entrada | Entrada validada e registrada no histórico | Atendido |
| RF13 Alerta | Quantidade disponível igual ou abaixo do mínimo | Atendido |
| RF14 Venda presencial | Mini-PDV, total persistido e pagamento recebido no balcão | Atendido |
| RF15 Código de barras | Scanner como teclado, código exato seguido de Enter | Atendido; sem leitor por câmera |
| RF16 Busca manual PDV | Nome ou código e seleção de resultado | Atendido |
| RF17 Baixa automática | PDV imediato; online após confirmação; travas contra concorrência | Atendido no ambiente demonstrativo |
| RF18 Relatório | Mês selecionado, vendas pagas, itens, receita, ticket e ranking | Atendido |
| RNF01 Responsividade | Layout original preservado; tabelas com rolagem horizontal | Implementado e com teste de catálogo/carrinho em celular |
| RNF02 PWA | Manifesto, ícones, service worker e interface offline | Implementado no build; instalação depende do navegador |
| RNF03 Usabilidade | Telas existentes, mensagens de erro e estado de gravação | Implementado; sem pesquisa formal com usuários |
| RNF04 Desempenho | Índices, pool e consultas transacionais | Implementado; sem ensaio formal de carga |
| RNF05 Segurança | Hashes scrypt, cookie HttpOnly, validação, consultas parametrizadas | Implementado para o escopo acadêmico |
| RNF06 Acesso | Papéis conferidos em todas as rotas restritas | Implementado e testado |
| RNF07 Compatibilidade | React e APIs web padrão; Chromium automatizado | Firefox, Edge, Safari e dispositivos físicos não validados nesta entrega |
| RNF08 Tecnologias | React, TypeScript, Node/Express e PostgreSQL | Atendido |

As regras RN01–RN07, RN09 e RN10 são aplicadas pela API nas rotas relevantes e apoiadas por restrições do banco. RN08 só representa uma confirmação **simulada**, até que um provedor real seja implementado.

O papel “funcionário” pode avançar status de pedidos pela API, conforme os eventos descritos no documento. A tela original desse perfil é o PDV; o painel visual de status continua sendo administrativo. Clientes não acessam pedidos de outros clientes, mesmo com nomes iguais. O administrador também pode criar contas de funcionário pela API; a primeira conta sem seed pode ser criada pelo comando `user:create`.

Avaliações de produtos aparecem no texto descritivo do papel de cliente, mas não nos RF01–RF18. Não foram implementadas. CPF/CNPJ opcional não possui formulário específico nesta versão; cadastro básico e entrega utilizam os campos previstos nos respectivos RFs.

# Validação da entrega

Validação local realizada em 18/10/2026.

| Verificação | Resultado |
| --- | --- |
| TypeScript e build de produção Vite | Passou |
| Migrações 001 e 002 em PostgreSQL 17.6 | Passou |
| Testes de integração HTTP com PostgreSQL real | 16 passaram, nenhum ignorado |
| Testes Playwright no Chromium 153 | 6 passaram |
| Compra, sessão e carrinho após recarregar | Passou no navegador |
| Cadastro, edição de preço, entrada e desativação de produto | Passou no navegador |
| PDV por código de barras seguido de Enter | Passou no navegador |
| Relatório em período com e sem vendas | Passou no navegador |
| Service worker, abertura offline e ausência de API no cache | Passou no navegador |
| Catálogo/carrinho em viewport 390 × 844 | Passou |
| YAML de Compose e GitHub Actions | Sintaxe verificada |
| package.json e package-lock.json | Dependências sincronizadas |
| Docker Compose completo | Não executado localmente: Docker indisponível no ambiente |
| Workflow hospedado no GitHub | Incluído; depende de enviar o projeto ao repositório |

Os testes de API verificam concorrência entre vendas, duplicidade de requisição, confirmação repetida de pagamento, isolamento de pedidos, CSRF, autorização, rollback e reconciliação do histórico com o estoque. O relatório é validado também no caso sem vendas, sem divisão por zero.

A validação não representa um teste de carga ou auditoria de produção. Pagamentos são demonstrativos. Instalação manual no sistema operacional, aparelhos físicos e outros navegadores não foram testados. O job Docker do workflow foi incluído para executar a inicialização completa no GitHub.

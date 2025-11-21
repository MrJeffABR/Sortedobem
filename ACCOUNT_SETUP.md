# Configuração da Conta AbacatePay 🥑

Você vinculou a chave de API de desenvolvimento: `abc_dev_YWHGs2stnPy6yZUzEreg2GQW` ao projeto.

## 1. Recebimento de Valores

Para que o dinheiro pago pelos usuários caia na sua conta, siga estes passos:

1.  Acesse o painel do AbacatePay: [https://abacatepay.com/](https://abacatepay.com/)
2.  Vá em **Configurações** > **Dados Bancários**.
3.  Cadastre sua chave PIX ou conta bancária onde deseja receber os repasses.
4.  **Nota:** Em modo de desenvolvimento (`abc_dev_`), nenhum dinheiro real é movimentado, e nenhum valor será depositado na sua conta. Isso serve apenas para testes de integração.

## 2. Testando em Modo de Desenvolvimento

Como sua chave começa com `abc_dev_`, a aplicação está em **Modo de Teste**.

1.  Crie uma nova rifa no sistema.
2.  Você será redirecionado para a página de pagamento.
3.  Um aviso azul "Modo de Teste" aparecerá.
4.  Escaneie o QR Code com o app do seu banco (alguns bancos detectam que é teste e não cobram, ou você pode usar as ferramentas de teste do próprio AbacatePay se disponíveis).
5.  **Simulação:** Se o pagamento real não for possível, você pode simular a confirmação alterando manualmente o status no banco de dados ou aguardando que a funcionalidade de "Mock Payment" do AbacatePay processe a transação de teste.

## 3. Webhook e Produção

Quando estiver pronto para receber dinheiro de verdade:

1.  Gere uma chave de produção no painel (começa com `abc_live_`).
2.  Atualize o arquivo `.env` com a nova chave.
3.  Configure a URL do Webhook no painel do AbacatePay:
    *   Vá em **Developers** > **Webhooks**.
    *   Adicione a URL onde seu backend está hospedado (ex: `https://sua-api.com/webhooks/abacatepay`).
    *   Copie o `Webhook Secret` e adicione ao `.env` como `VITE_WEBHOOK_SECRET`.

## 4. Debugging

Se algo der errado:
*   Abra o Console do Navegador (F12).
*   Procure por logs com o prefixo `[AbacatePay]`.
*   Verifique se o ID da cobrança está sendo gerado corretamente.

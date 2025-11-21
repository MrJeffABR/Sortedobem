
# Integração AbacatePay - Sorte do Bem

Este documento detalha a implementação do gateway de pagamento **AbacatePay** para a taxa de ativação de rifas.

## 1. Configuração Inicial

### Variáveis de Ambiente
Certifique-se de que o arquivo `.env` contém as chaves corretas obtidas no painel do AbacatePay (https://abacatepay.com/configuracoes/api).

```env
VITE_ABACATEPAY_API_KEY=abacate_api_key_...
```

### Modo de Desenvolvimento vs. Produção
- **Desenvolvimento:** O AbacatePay não possui um ambiente de "Sandbox" oficial separado no momento da escrita, mas você pode criar cobranças de valor baixo (R$ 1,00) para testar.
- **Webhook Local:** Para testar webhooks localmente, você precisará de um proxy reverso como **Ngrok** apontando para sua Edge Function (veja seção Webhook).

## 2. Fluxo de Pagamento

1.  **Criação da Rifa (`CreateRafflePage.tsx`)**:
    - O usuário preenche os dados e clica em "Gerar PIX e Continuar".
    - O sistema chama `createPixCharge` em `lib/abacatepay-config.ts`.
    - Uma cobrança ("Billing") é criada na API do AbacatePay.
    - O ID da cobrança (`abacatePayId`) e o código PIX Copia e Cola (`abacatePayPixCode`) são salvos no objeto `Payment` local.

2.  **Pagamento (`PaymentPage.tsx`)**:
    - O usuário é redirecionado para esta página.
    - Um **QR Code** é gerado dinamicamente usando o código PIX retornado pela API.
    - O frontend inicia um **Polling** (verificação repetida) a cada 5 segundos chamando `checkPaymentStatus`.

3.  **Confirmação**:
    - Assim que o cliente paga no banco, o status na API muda para `PAID`.
    - O Polling detecta essa mudança.
    - O status local da rifa é atualizado para `active`.
    - O usuário vê a mensagem de sucesso instantaneamente.

## 3. Webhook (Server-Side)

Embora a aplicação use *Polling* no frontend para uma experiência rápida, implementamos um handler de webhook em `lib/payment-handler.ts` para robustez futura (ex: se o usuário fechar a aba antes da confirmação).

Este arquivo deve ser implantado em um ambiente Serverless (ex: Supabase Edge Functions).

### Exemplo de implementação em Supabase Edge Function:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { verifyWebhookSignature, processPaymentWebhook } from '../lib/payment-handler.ts' // (Adapte o import)

serve(async (req) => {
  const signature = req.headers.get("x-webhook-signature")
  const body = await req.text()

  if (!await verifyWebhookSignature(body, signature)) {
    return new Response("Invalid Signature", { status: 401 })
  }

  const event = JSON.parse(body)
  const result = await processPaymentWebhook(event)

  return new Response(JSON.stringify(result), { 
    headers: { "Content-Type": "application/json" } 
  })
})
```

## 4. Solução de Problemas

- **QR Code não aparece:** Verifique se a `VITE_ABACATEPAY_API_KEY` está correta. Abra o console do navegador para ver erros de rede.
- **Pagamento não confirma:** Verifique se o polling está ativo (olhe a aba Network do DevTools, requisições para `api.abacatepay.com`).
- **Erro CORS:** As requisições são feitas diretamente do browser (`fetch`). Se a API do AbacatePay bloquear CORS no futuro, será necessário usar um Proxy ou Edge Function para intermediar a criação da cobrança.

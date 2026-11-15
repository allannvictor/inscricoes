# Guia: "Conectar Mercado Pago" (como ficou configurado)

> **Situação (15/11/2026):** configurado e testado na homologação.

## Aplicação no Mercado Pago (conta do Allan)
- Aplicação **`inscricoes-app`** (Checkout Transparente, API de Orders). É a mesma do Pix da CF.
- **Configurações da aplicação → Configuração avançada:**
  - URLs de redirecionamento: `https://hml.inscricoesfast.com.br/api/mercadopago/oauth/callback` e `https://www.inscricoesfast.com.br/api/mercadopago/oauth/callback`;
  - PKCE: **Sim**;
  - permissões: leitura, acesso offline e escrita.
- **Webhooks:** a aba **Produção** deve apontar para `https://www.inscricoesfast.com.br/api/webhooks/mercadopago` (tópico Order). Ainda falta confirmar com um print. A aba **Teste** pode apontar para o webhook do hml. **Nunca** coloque a URL do `oauth/callback` no campo de webhook.
- **Client ID e Client Secret:** em **Credenciais → Produção**. Eles vão só na Vercel.

## Vercel
- **Preview:** `MP_CLIENT_ID`, `MP_CLIENT_SECRET` e `ADMIN_EMAILS` (configurados em 14/11).
- **Production:** configurar quando a etapa 6 for para a produção.

## Teste na homologação (14/11)
- O master criou o **Clube Teste** (`clube-teste`) e conectou uma **conta de teste** do Mercado Pago (vendedor "Clube teste hml"). A conexão funcionou, e a tela de Pagamento mostra titular, apelido, e-mail mascarado e número da conta.
- O Pix de um clube conectado a uma **conta de teste** é recusado com `invalid_users_involved`: o Mercado Pago só deixa conta de teste transacionar com outra conta de teste, e o pagador é uma pessoa real.
  - O Allan decidiu **não** fazer um "pagador de teste" na homologação.
  - Para testar inscrições no hml, deixe o clube **desconectado** (Pix simulado, com o botão "Simular Pix recebido").
- **Ideia para o futuro** (não aprovada): reconhecer **conta de teste** na conexão, avisar o organizador e, em produção, recusar. Com uma conta de teste conectada, nenhum atleta consegue pagar.
- **Log:** quando o Mercado Pago recusa, a Vercel (aba **Logs**, busca "Mercado Pago") mostra o código e o motivo, sem dados pessoais.

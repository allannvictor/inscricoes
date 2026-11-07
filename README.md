# Inscrições

Site de inscrições para simulados e provas de corrida. O primeiro clube é a CF Assessoria Esportiva.

O fluxo do atleta é: página do evento → entra com o e-mail e um código de 6 dígitos → preenche os participantes → paga com Pix → recebe a confirmação.

- **Plano completo e etapas:** [`docs/PLANO.md`](docs/PLANO.md)
- **Protótipo clicável:** [`docs/prototipo.html`](docs/prototipo.html), que abre direto no navegador.

## Situação

| Etapa | Estado |
|---|---|
| 1. Inscrição com Pix | **Pronta para teste**: login por código, vários participantes, preço de sócio, meia 60+, cupom, Pix (Mercado Pago ou simulado), confirmação por e-mail |
| 2. Painel do organizador | A fazer. Por enquanto o evento é criado pelo `npm run db:seed` |
| 3 a 6 | A fazer |

## Stack

Next.js 15 (React 19, TypeScript) · Tailwind CSS 4 · Postgres (Neon) com Drizzle ORM · Zod · Mercado Pago (Pix) · Resend (e-mail) · Vitest e Playwright (testes) · Vercel (hospedagem).

## Rodar na sua máquina

Pré-requisitos: **Node.js 22** e um Postgres. O mais simples é criar um banco gratuito em [neon.tech](https://neon.tech) e copiar a "connection string". Também dá para usar um Postgres local.

```bash
git clone https://github.com/allannvictor/inscricoes.git
cd inscricoes
npm install
cp .env.example .env.local      # no Windows: copy .env.example .env.local
```

Edite o `.env.local`:
- coloque a `DATABASE_URL` do seu banco;
- para testar sem e-mail de verdade, coloque `LOGIN_CODIGO_TESTE=123456`. Esse código fixo só vale fora de produção.

```bash
npm run db:migrate   # cria as tabelas
npm run db:seed      # cria o clube CF, o "Simulado 10K", sócios e cupons de exemplo
npm run dev          # abre em http://localhost:3000
```

Depois abra **http://localhost:3000/eventos/simulado-10k-dezembro**.

- Sem `RESEND_API_KEY`, os e-mails (inclusive o código de login) **aparecem no terminal** do `npm run dev`.
- Sem `MP_ACCESS_TOKEN`, o site roda em **modo simulado**: o Pix é de mentira e aparece o botão "Modo teste: simular Pix recebido".

### Dados de exemplo (seed)

- **Sócios:** CPFs `529.982.247-25` e `111.444.777-35`. Com eles, o preço de sócio aparece sozinho.
- **Meia:** qualquer data de nascimento de quem já tem 60 anos ou mais.
- **Cupons:** `AMIGO10` (10%) e `PARCEIRO` (R$ 10). Valem só para quem paga preço cheio.

## Testes

```bash
npm test             # regras de preço, meia, cupom, categoria, CPF, permissões, assinatura do webhook
npm run test:e2e     # fluxo completo no navegador (precisa do banco com seed; na 1ª vez: npx playwright install chromium)
npm run lint
npm run typecheck
```

O GitHub Actions (`.github/workflows/ci.yml`) roda tudo isso a cada push.

## Onde mexer em cada coisa

| Quero mudar… | Arquivo |
|---|---|
| Regras de preço (sócio, meia 60+, não acumular) | `src/lib/regras/preco.ts` |
| Regras de cupom | `src/lib/regras/cupom.ts` |
| Faixas de categoria por idade | `src/lib/regras/categoria.ts` |
| Quem pode ver pedidos e inscrições | `src/lib/auth/permissoes.ts` |
| Criar pedido, reservar vagas, confirmar pagamento | `src/lib/pedidos/servico.ts` |
| Tempo de reserva do Pix (30 min) | `MINUTOS_RESERVA` em `src/lib/pedidos/servico.ts` |
| Integração Mercado Pago | `src/lib/pagamento/mercadopago.ts` |
| Textos dos e-mails | `src/lib/email/modelos.ts` |
| Cores e fontes | `src/app/globals.css` (bloco `@theme`) |
| Página do evento | `src/app/eventos/[slug]/page.tsx` |
| Formulário de inscrição | `src/components/FormularioInscricao.tsx` |
| Tela do Pix e confirmação | `src/app/pedidos/[id]/page.tsx` e `src/components/PixPagamento.tsx` |
| Tabelas do banco | `src/db/schema.ts`, depois `npm run db:generate` e `npm run db:migrate` |

Os valores em dinheiro ficam sempre em **centavos** (inteiros), para não haver erro de arredondamento.

## Mercado Pago

1. Em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) → **Suas integrações** → **Criar aplicação** (pagamentos online, Checkout Transparente).
2. Em **Credenciais de teste** copie o *Access Token* para `MP_ACCESS_TOKEN`. Para cobrar de verdade, use o de **produção**.
3. Em **Webhooks**, cadastre `https://SEU-SITE/api/webhooks/mercadopago` com o evento **Pagamentos**, e copie a chave secreta para `MP_WEBHOOK_SECRET`.
   - O webhook só funciona com o site publicado (https).
   - Localmente, a tela do Pix consulta o Mercado Pago a cada 5 segundos, então a confirmação funciona mesmo sem webhook.

**No Pix real:** o e-mail de quem paga precisa ser diferente do e-mail da conta Mercado Pago que recebe.

## Publicar (Vercel + Neon)

1. Importe o repositório na Vercel.
2. Configure as variáveis do `.env.example`: `DATABASE_URL` do Neon (use a URL com *pooler*), `APP_URL` com o endereço `https://...vercel.app` e `SESSION_SECRET` com um texto longo aleatório.
3. Rode `npm run db:migrate` e `npm run db:seed` apontando para o banco do Neon. O seed pode ser rodado da sua máquina.
4. Enquanto o Mercado Pago não estiver configurado, `PERMITIR_SIMULADO=1` libera o modo simulado na prévia. **Tire essa variável** antes de abrir as inscrições de verdade.

# Inscrições

Site de inscrições para simulados e provas de corrida. O primeiro clube é a CF Assessoria Esportiva.

O fluxo do atleta é: página do evento → entra com o e-mail e um código de 6 dígitos → preenche os participantes → paga com Pix → recebe a confirmação.

- **Plano completo e etapas:** [`docs/PLANO.md`](docs/PLANO.md)
- **Onde paramos / como continuar:** [`docs/CONTINUACAO.md`](docs/CONTINUACAO.md)
- **Protótipo clicável:** [`docs/prototipo.html`](docs/prototipo.html), que abre direto no navegador.

## Situação

| Etapa | Estado |
|---|---|
| 1. Inscrição com Pix | **Concluída**: login por código, vários participantes, preço de sócio, meia 60+, cupom, Pix (Mercado Pago ou simulado), confirmação por e-mail |
| 2. Painel do organizador | **Concluída**: eventos (criar, editar, publicar, duplicar, imagem, regulamento), inscritos (resumo, filtros, cancelar, planilha), cupons, sócios, perfil do clube, organizadores, usuário master |
| 3. Área do atleta | **Pronta para teste**: minhas inscrições, comprovante, transferência pelo atleta, meus dados |
| 4. Identidade visual (layout novo) | A fazer |
| 5. Versão para computador | A fazer |
| 6 a 8 | A fazer (uso real, extras, outros clubes) |

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
| Quem acessa o painel (organizador, master) | `src/lib/auth/permissoes.ts` e `src/lib/painel/acesso.ts` |
| Ações do painel (salvar evento, cancelar, cupons, sócios…) | `src/app/painel/acoes.ts` |
| Telas do painel | `src/app/painel/` e `src/components/painel/` |
| Colunas da planilha de inscritos | `src/app/painel/c/[clube]/eventos/[id]/planilha/route.ts` |
| Minhas inscrições e comprovante | `src/app/minhas-inscricoes/`, `src/app/inscricoes/[id]/` e `src/lib/atleta/consultas.ts` |
| Regras da transferência | `src/lib/atleta/transferencia.ts` (prazo em `src/lib/regras/transferencia.ts`) |
| Tabelas do banco | `src/db/schema.ts`, depois `npm run db:generate` e `npm run db:migrate` |

Os valores em dinheiro ficam sempre em **centavos** (inteiros), para não haver erro de arredondamento.

## Mercado Pago

1. Em [mercadopago.com.br/developers](https://www.mercadopago.com.br/developers) → **Suas integrações** → **Criar aplicação** → **Checkout Transparente** → tipo de API **Orders**.
2. Em **Credenciais de teste** copie o *Access Token* para `MP_ACCESS_TOKEN`. Para cobrar de verdade, use o de **produção**.
3. Em **Webhooks**, cadastre `https://SEU-SITE/api/webhooks/mercadopago` com o tópico **Order**, e copie a chave secreta para `MP_WEBHOOK_SECRET`.
   - O webhook só funciona com o site publicado (https).
   - Localmente, a tela do Pix consulta o Mercado Pago a cada 5 segundos, então a confirmação funciona mesmo sem webhook.

**No Pix real:** o e-mail de quem paga precisa ser diferente do e-mail da conta Mercado Pago que recebe.

## Publicar (Vercel + Neon)

1. Na Vercel: **Add New → Project** e importe `allannvictor/inscricoes`. Ela detecta o Next.js sozinha.
2. No projeto: **Storage → Create Database → Neon**. A integração cria `DATABASE_URL` e `DATABASE_URL_UNPOOLED` automaticamente.
3. Em **Settings → Environment Variables**, adicione:
   - `SESSION_SECRET`: um texto longo e aleatório;
   - `APP_URL`: o endereço `https://...vercel.app`;
   - `RODAR_SEED=1`: só no primeiro deploy, para criar o evento de exemplo;
   - `PERMITIR_SIMULADO=1`: enquanto o Mercado Pago não estiver configurado;
   - `RESEND_API_KEY`: para os e-mails.
4. Faça um **Redeploy**. O build (`vercel-build`) aplica as migrações no banco, roda o seed se `RODAR_SEED=1` estiver ligado e publica o site.

Antes de abrir inscrições de verdade:
- **remova** `PERMITIR_SIMULADO`;
- remova `RODAR_SEED` (ou o evento de exemplo).

### Prévias (branches que não são o `main`)

Cada branch enviado ao GitHub vira uma **prévia** na Vercel. Prévias **nunca** usam o banco de produção:
- Elas leem só `DATABASE_URL_PREVIEW`, que é um branch do Neon chamado, por exemplo, `preview`.
- Sem essa variável, o build da prévia falha de propósito.

Configuração, uma vez só:
1. No Neon (**Open in Neon → Branches → New branch**), crie o branch `preview` a partir do `main` e copie a connection string.
2. Na Vercel, em **Environment Variables**, marque **só Preview** e adicione:
   - `DATABASE_URL_PREVIEW` com a connection string;
   - `SESSION_SECRET` com outro texto aleatório;
   - `PERMITIR_SIMULADO=1`;
   - `RODAR_SEED=1`.
3. Não coloque `MP_ACCESS_TOKEN` em Preview. Assim as prévias usam o Pix simulado e nunca cobram de verdade.

### Site fechado até o lançamento ("em breve")

Na Vercel, em **Production**, adicione:
- `PRE_LANCAMENTO=1`;
- `CHAVE_PRE_LANCAMENTO`, com uma palavra secreta longa.

Com isso:
- O público vê só "Inscrições em breve".
- Você entra abrindo `https://SEU-SITE/?acesso=SUA-CHAVE`, e o navegador fica liberado por 90 dias.
- O webhook do Mercado Pago e o `/api/status` continuam funcionando.
- No lançamento, apague `PRE_LANCAMENTO` e faça Redeploy.

## Painel do organizador

Fica em **`/painel`**, com o mesmo login por código.
- **Organizador:** quem está na lista de organizadores de um clube (Perfil do clube → Organizadores). Pode tudo nos eventos do clube.
- **Master:** os e-mails em `ADMIN_EMAILS` acessam o painel de qualquer clube. Não existe senha master: o acesso é pelo código enviado ao e-mail.

### Arquivos (imagem do evento, foto do clube, regulamento)

Na Vercel:
1. Abra **Storage → Create → Blob** e conecte ao projeto (Production e Preview). Isso cria `BLOB_READ_WRITE_TOKEN`.
2. Faça Redeploy.

O navegador reduz as imagens antes de enviar. Limite: 4 MB por arquivo.


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
| 3. Área do atleta | **Aprovada** (no `staging`): minhas inscrições (abas Inscrito, Cancelados e Passadas, agrupadas por prova), comprovante, transferência pelo atleta, meus dados |
| 4. Identidade visual (layout novo) | **Pronta para teste**: cor e nome do preço especial por clube, página do evento com foto em destaque, ícones, selos, agenda, compartilhar e sanfonas |
| 5. Versão para computador | **Pronta para teste**: evento, formulário e Pix com lateral fixa no computador, página inicial em grade, testes em 1366 px |
| 6. Cadastro de clubes + login novo | **Pronta para teste**: clubes criados pelo master (com convite), "Conectar Mercado Pago" por clube, senha opcional e Entrar com Google |
| 7 a 9 | A fazer (uso real, extras, plataforma aberta) |

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
npm test             # (precisa do Postgres local migrado: os testes de limite de tentativas usam o banco)
# regras de preço, meia, cupom, categoria, CPF, permissões, assinatura do webhook
npm run test:e2e     # fluxo completo no navegador (roda no celular e num monitor de 1366 px; precisa do banco com seed; na 1ª vez: npx playwright install chromium)
# Mais estável (versão compilada, como no CI): npm run build && E2E_PRODUCAO=1 npm run test:e2e
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
| Cor de cada clube (padrão, contraste do botão e dos links) | `src/lib/regras/cores.ts` e `src/components/TemaClube.tsx` |
| Nome do preço especial ("Aluno CF"; padrão "Sócio") | `nomePrecoEspecial` em `src/lib/regras/preco.ts` |
| Ícones | `src/components/Icones.tsx` |
| Agenda (.ics), mapa e compartilhar | `src/lib/agenda.ts` e `src/app/eventos/[slug]/agenda.ics/route.ts` |
| Página inicial | `src/app/page.tsx` |
| Para onde o site pode mandar depois do login (só caminhos internos) | `src/lib/regras/redirecionamento.ts` |
| Limites: pedidos aguardando Pix, consultas de CPF, cupom, tentativas de código e senha | `src/lib/regras/limites-pedido.ts`, `src/lib/limites.ts`, `src/lib/auth/codigo-email.ts`, `src/lib/auth/senha.ts` |
| Quem vê uma inscrição (o CPF não dá acesso) | `podeVerInscricao` em `src/lib/auth/permissoes.ts` |
| Cabeçalhos de segurança | `next.config.ts` |
| Revisão de segurança antes da produção (agente) | `.claude/agents/revisor-seguranca.md` |
| Página do evento | `src/app/eventos/[slug]/page.tsx` |
| Formulário de inscrição | `src/components/FormularioInscricao.tsx` |
| O que é obrigatório por pessoa (sexo só com categoria, camisa só se o evento pede) e quando "Você" aparece em resumo | `src/lib/regras/participante.ts` |
| "Quem você já inscreveu" (botões para adicionar de novo) | `pessoasJaInscritas` em `src/lib/atleta/consultas.ts` |
| Tela do Pix e confirmação | `src/app/pedidos/[id]/page.tsx` e `src/components/PixPagamento.tsx` |
| Quem acessa o painel (organizador, master) | `src/lib/auth/permissoes.ts` e `src/lib/painel/acesso.ts` |
| Ações do painel (salvar evento, cancelar, cupons, sócios…) | `src/app/painel/acoes.ts` |
| Telas do painel | `src/app/painel/` e `src/components/painel/` |
| Colunas da planilha de inscritos | `src/app/painel/c/[clube]/eventos/[id]/planilha/route.ts` |
| Minhas inscrições e comprovante | `src/app/minhas-inscricoes/`, `src/app/inscricoes/[id]/` e `src/lib/atleta/consultas.ts` |
| Abas de Minhas inscrições (Inscrito, Cancelados, Passadas) e agrupamento por prova | `src/lib/atleta/abas.ts` |
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

### Conta de cada clube ("Conectar Mercado Pago")

Cada clube conecta a própria conta em **Painel → Pagamento**, e o Pix das inscrições dele cai direto nela.
- **Na aplicação do Mercado Pago:**
  - em **URLs de redirecionamento**, cadastre `https://SEU-SITE/api/mercadopago/oauth/callback` (uma para a homologação e outra para a produção);
  - ligue o **PKCE**;
  - copie o *Client ID* e o *Client Secret* para `MP_CLIENT_ID` e `MP_CLIENT_SECRET`.
- **Tokens:** ficam criptografados no banco (chave derivada do `SESSION_SECRET`) e são renovados sozinhos antes de vencer (valem 180 dias).
- **Token do site:** `MP_ACCESS_TOKEN` vale **só** para o clube de `MP_CLUBE_DO_TOKEN` (padrão: `cf-assessoria`). Um clube sem conta conectada nunca usa a conta de outro.
- **Publicar evento:** só depois de conectar. Fora da produção, o Pix simulado também vale. **Em produção, o Pix simulado nunca vale**, mesmo com `PERMITIR_SIMULADO`.
- **Aviso:** conectar, trocar ou desconectar a conta manda um e-mail para todos os organizadores do clube e para os masters.
- Regras em `src/lib/pagamento/situacao.ts`; conexão em `src/lib/pagamento/oauth-mercadopago.ts`.

## Entrar (código, senha e Google)

- **Código por e-mail:** o padrão; a conta nasce no primeiro acesso.
- **Senha opcional:** criada em Meus dados → Acesso.
  - Hash Argon2id; aceita 5 tentativas erradas a cada 15 minutos por e-mail e 30 por IP (só o hash do IP é guardado). O pedido de código tem limite de 20 por hora por IP.
  - Criar, trocar ou remover a senha encerra as sessões nos outros aparelhos e avisa por e-mail.
  - "Esqueci a senha": entrar com o código e criar outra.
  - Arquivos: `src/lib/auth/senha.ts` e `src/lib/regras/senha.ts`.
- **Entrar com Google:** aparece quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão configurados.
  - Liga a conta pelo e-mail verificado do Google.
  - URL de retorno: `https://SEU-SITE/api/auth/google/callback`.
  - Arquivos: `src/lib/auth/google.ts` e `src/lib/auth/google-login.ts`.

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

### Fluxo de branches

| Branch | Ambiente | Endereço |
|---|---|---|
| `claude/…` (trabalho) | prévia avulsa da Vercel | `*.vercel.app` |
| `staging` | **homologação** | https://hml.inscricoesfast.com.br |
| `main` | **produção** | https://www.inscricoesfast.com.br |

O PR do branch de trabalho vai para o `staging`. Depois de testado na homologação, sai um PR `staging` → `main`.

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
- **Master:** os e-mails em `ADMIN_EMAILS` acessam o painel de qualquer clube e **criam clubes** (`/painel` → "+ Novo clube").
  - Ao criar um clube, o primeiro organizador recebe um convite por e-mail.
  - O mesmo vale para quem é adicionado em Perfil do clube → Organizadores.

### Arquivos (imagem do evento, foto do clube, regulamento)

Na Vercel:
1. Abra **Storage → Create → Blob** e conecte ao projeto (Production e Preview). Isso cria `BLOB_READ_WRITE_TOKEN`.
2. Faça Redeploy.

O navegador reduz as imagens antes de enviar. Limite: 4 MB por arquivo.


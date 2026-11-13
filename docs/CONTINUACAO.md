# Continuação do projeto: leia antes de começar

Este arquivo resume **onde paramos**, **como trabalhamos** e **o que falta**, para continuar numa nova sessão.
Os detalhes técnicos estão no `README.md` e o plano completo em `docs/PLANO.md`.

> Última atualização: 13/11/2026, durante a etapa 3, com o PR #5 aguardando teste e merge.

---

## 1. O projeto em uma frase

Site de inscrições para simulados e provas de corrida, chamado **Inscrições Fast**. O primeiro clube é a **CF Assessoria Esportiva** (Aracaju/SE), e a ideia é atender outros clubes no futuro.
- Atleta: página do evento → login com código por e-mail → participantes → Pix → confirmação.
- Organizador: painel em `/painel`.

## 2. Como o dono do projeto (Allan) gosta de trabalhar

- **Conversa em português**, explicações simples e passo a passo com prints. Ele mexe na Vercel, no Neon, no Resend, no Mercado Pago e no Registro.br pela tela.
- **Uma etapa por vez:** só começar uma etapa quando ele autorizar. No fim de cada etapa, parar, mostrar o resultado e **abrir um PR**.
- **Testar na homologação antes do merge.** Avisar claramente quando um PR está "pronto para o merge" e quando ainda não está.
- **Antes de mudar algo do plano no meio de uma etapa, perguntar.**
- **Nunca pedir segredos no chat** (tokens, senhas, chaves). Eles vão direto nas variáveis da Vercel.
- O merge é ele que faz. Depois do merge, o branch de trabalho recomeça do `main`.

## 3. Ambientes e endereços

| | Produção | Homologação |
|---|---|---|
| Site | **https://www.inscricoesfast.com.br** (`inscricoesfast.com.br` redireciona) | **https://hml.inscricoesfast.com.br** |
| Também | `inscricoes-black.vercel.app` | `inscricoes-hml.vercel.app` |
| Publica a partir de | branch `main` (merge de PR) | branch de trabalho (`claude/…`), a cada push |
| Banco (Neon) | branch `main` | branch `homologacao` (só via `DATABASE_URL_PREVIEW`) |
| Pix | Mercado Pago **real** (credencial de produção, API de **Orders**) | **simulado** (sem `MP_ACCESS_TOKEN` em Preview) |
| E-mail | Resend com domínio verificado (`nao-responda@inscricoesfast.com.br`) | Resend (se `EMAIL_FROM` estiver em Preview) |
| Acesso | **modo "em breve" ligado**: público vê "Em breve"; entra com `?acesso=<CHAVE_PRE_LANCAMENTO>` | protegida pelo login da Vercel (Deployment Protection), ainda ligada |

- **Diagnóstico sem segredos:** `/api/status` em cada ambiente mostra versão, pagamento, e-mail, modo "em breve", homologação e código de teste.
- **Domínio:** comprado no Registro.br, com DNS no próprio Registro.br (modo avançado). Registros:
  - `A @ 216.198.79.1`;
  - CNAME `www` e `hml` → `10870092b9ea72a2.vercel-dns-017.com.`;
  - do Resend: TXT `resend._domainkey`, CNAME `rsend` e CNAME `send`;
  - TXT `_dmarc` `v=DMARC1; p=none;`.
- **Blob (Vercel):** loja `inscricoes-arquivos`, pública, em São Paulo. **Não revogar o `BLOB_READ_WRITE_TOKEN`:** o código depende dele.
- **Região:** funções da Vercel em São Paulo (gru1), assim como o Neon e o Blob.

### Variáveis na Vercel (só os nomes; os valores estão lá)

- **Production:**
  - banco: `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (da integração Neon);
  - sessão e site: `SESSION_SECRET`, `APP_URL=https://www.inscricoesfast.com.br`;
  - e-mail: `RESEND_API_KEY`, `EMAIL_FROM`;
  - Mercado Pago: `MP_ACCESS_TOKEN` (produção), `MP_WEBHOOK_SECRET`;
  - acesso: `ADMIN_EMAILS` (o e-mail do Allan = master), `PRE_LANCAMENTO=1`, `CHAVE_PRE_LANCAMENTO`;
  - arquivos: `BLOB_*`;
  - `PERMITIR_SIMULADO=1`. Ainda está ligado, mas não tem efeito com o token presente. **Remover antes do lançamento.**
- **Preview:**
  - banco e sessão: `DATABASE_URL_PREVIEW`, `SESSION_SECRET` (outro valor);
  - modo teste: `PERMITIR_SIMULADO=1`, `RODAR_SEED=1`, possivelmente `LOGIN_CODIGO_TESTE`;
  - e-mail e site: `RESEND_API_KEY`, `APP_URL=https://hml.inscricoesfast.com.br`, `ADMIN_EMAILS`;
  - arquivos: `BLOB_*`.
  - Talvez `EMAIL_FROM`, `PRE_LANCAMENTO` e `CHAVE_PRE_LANCAMENTO` (de homologação). Confirmar com o Allan.

## 4. Situação das etapas

| Etapa | Situação |
|---|---|
| 0. Protótipo | ✅ `docs/prototipo.html` |
| 1. Inscrição com Pix | ✅ em produção; Pix real de R$ 1 confirmado sozinho |
| 2. Painel do organizador | ✅ em produção (PR #4) |
| **3. Área do atleta** | 🟡 **PR #5 aberto**: Allan está testando na homologação. **Não fazer merge sem ele aprovar** |
| 4. Identidade visual (layout novo) | ⏳ nova, ver seção 6 |
| 5. Versão para computador (páginas do atleta) | ⏳ |
| 6. Uso real / lançamento | 🟡 parte feita (domínio, e-mail, Mercado Pago de produção); falta o resto, ver seção 7 |
| 7. Extras | ⏳ cartão, check-in com QR, lotes de preço por data… |
| 8. Outros clubes | ⏳ inclui "Conectar Mercado Pago" (OAuth) por clube e comissão da plataforma |

PRs anteriores, todos com merge feito:
- [#1](https://github.com/allannvictor/inscricoes/pull/1): etapa 1.
- [#2](https://github.com/allannvictor/inscricoes/pull/2): homologação com banco próprio.
- [#3](https://github.com/allannvictor/inscricoes/pull/3): modo "em breve".
- [#4](https://github.com/allannvictor/inscricoes/pull/4): etapa 2.

PR aberto: [#5](https://github.com/allannvictor/inscricoes/pull/5), etapa 3.

## 5. Próximo passo imediato

1. Esperar o Allan terminar os testes do **PR #5** em `hml.inscricoesfast.com.br`. O roteiro de teste está na descrição do PR.
2. Corrigir o que ele apontar. Quando ele aprovar, dizer "pode fazer o merge".
3. Depois do merge, recomeçar o branch de trabalho do `main` e perguntar qual etapa seguir. A sugestão é fazer a **etapa 4 (visual) junto com a 5 (computador)**, porque mexem nas mesmas telas.

## 6. Etapa 4: identidade visual (nova)

O Allan achou o site **"muito branco"**. Pesquisei boas práticas e montei um canvas com 3 direções no celular e a recomendada no computador, todas com os dados reais do Simuladão Run da CF: **https://claude.ai/artifact/FThMVBVDQ5N35EJfuQJW9y** (privado, só o Allan abre).

- **A · Faixa com a cor do clube:** topo inteiro na cor do clube, com logo e título em branco.
- **B · Foto em destaque:** foto grande no topo e um cartão branco flutuando por cima, com data, local e prazo, mais ícones.
- **C · Fundo suave e cartões:** fundo cinza-azulado, cartões brancos, chips com ícones, distâncias em grade 2×2 e "sanfonas" para o texto longo.
- **Recomendação: B + elementos da C.** Cada clube escolhe a **própria cor de destaque**, usada em botão, ícones e logo. Sem foto, o topo usa essa cor.

Melhorias de experiência sugeridas, para qualquer direção:
1. **Barra fixa embaixo no celular**, com **"a partir de R$ X"** e o botão Inscrever-se.
2. **No computador, um resumo fixo na lateral**, com distâncias e botão.
3. **Ícones e chips** para data, horário e local. Botões "ver no mapa", "adicionar à agenda" e "compartilhar" (WhatsApp).
4. **Selos:** "Inscrições abertas" e "faltam X dias". **Sinal de confiança:** "Pagamento seguro com Pix via Mercado Pago".
5. **Texto longo em sanfonas:** sobre, regulamento, termo e transferência.
6. **Formulário em etapas**, com indicador "Dados → Pagamento → Confirmado", pedindo só o essencial.
7. **Carregamento leve no 4G:** imagem otimizada.

**Pendente com o Allan:**
- qual direção ele prefere, ou se quer misturar;
- **a cor da CF** e o logo em boa resolução;
- se a etapa sai junto com a versão para computador.

Na implementação, precisa entrar um campo **"cor de destaque"** no Perfil do clube (banco: `clubes.cor`). As cores do tema ficam em `src/app/globals.css` (bloco `@theme`).

## 7. Pendências e decisões em aberto

- **Etapa 6 (lançamento):**
  - decidir a **hospedagem comercial**: o plano Hobby da Vercel é para uso não comercial. Opções: Vercel Pro (US$ 20 por mês) ou outra;
  - remover `PERMITIR_SIMULADO` da produção;
  - desligar o modo "em breve" (apagar `PRE_LANCAMENTO`) no dia do lançamento;
  - conferir se a **URL do webhook de produção no Mercado Pago** foi trocada para `https://www.inscricoesfast.com.br/api/webhooks/mercadopago`, tópico **Order**. Foi pedido ao Allan, mas não está confirmado;
  - desativar o cupom de teste `TESTE1REAL` em produção, se ainda não foi (`update cupons set ativo=false where codigo='TESTE1REAL'`).
- **Homologação para testadores:**
  - desligar a Deployment Protection das prévias na Vercel;
  - escolher entre o código fixo (`LOGIN_CODIGO_TESTE` só em Preview) e o e-mail de verdade (remover o código fixo e garantir `EMAIL_FROM` em Preview). **Recomendado: e-mail de verdade**, já que o domínio funciona;
  - ligar o modo "em breve" em Preview, com uma chave própria;
  - **cuidado:** com o código fixo, qualquer pessoa entra com o e-mail do Allan (master) na homologação. Sugestão: tirar `ADMIN_EMAILS` de Preview e usar organizador.
- **"Aluno CF" em vez de "sócio":** deixar o nome do preço especial configurável por clube. Pequeno; pode entrar na etapa 4.
- **Seguro atleta:** o site antigo (inscricoes.com.br) oferecia. Precisaria de uma seguradora parceira; fica para depois.
- **Página inicial:** hoje é só uma lista de eventos. Melhorar na etapa 4 ou 5.

## 8. Dicas técnicas para a próxima sessão

- **Stack:** Next.js 15 (App Router), TypeScript, Tailwind 4, Drizzle + Postgres (Neon), Zod, Resend, Mercado Pago (API de Orders), Vercel Blob, Vitest e Playwright.
- **Local:** Postgres 16 instalado no container (`service postgresql start`; ele **para sozinho** quando a sessão reinicia). Usuário, senha e banco são `inscricoes`. Rodar `npm run db:migrate` e `npm run db:seed`. O `.env.local` tem `LOGIN_CODIGO_TESTE=123456`.
- **Testes:**
  - `npm test` (unitários, 56);
  - `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --trace off` (5 de ponta a ponta);
  - `npm run lint`, `npm run typecheck` e `npm run build`;
  - o CI do GitHub roda tudo a cada push.
- **Migrações:** editar `src/db/schema.ts` → `npx drizzle-kit generate --name <nome>` → `npm run db:migrate`. Na Vercel, o `vercel-build` aplica as migrações sozinho.
- **Login nos testes:** limite de 5 códigos por hora por e-mail. Com `LOGIN_CODIGO_TESTE` (só fora de produção ou em Preview), nenhum e-mail é enviado.
- **Subconsultas com `sql`:** escrever a coluna qualificada (`"eventos"."id"`), não `${eventos.id}`. O Drizzle gera `"id"` sem tabela, o que causa erro ou contagem errada.
- **Rede da sessão:** o ambiente da sessão tem hosts liberados (domínios do site, docs do Mercado Pago). A homologação pede o login da Vercel, então não dá para testá-la daqui enquanto a proteção estiver ligada.
- **Regras de negócio importantes:** em `src/lib/regras/` (preço, meia 60+, sócio, cupom, categoria, CPF, transferência) e em `src/lib/auth/permissoes.ts`, todas com testes.

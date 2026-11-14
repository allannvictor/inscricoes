# Continuação do projeto: leia antes de começar

Este arquivo resume **onde paramos**, **como trabalhamos** e **o que falta**, para continuar numa nova sessão.
Os detalhes técnicos estão no `README.md` e o plano completo em `docs/PLANO.md`.

> Última atualização: 14/11/2026 (fim da sessão). Etapa 3 aprovada e **parada no `staging`** (decisão do Allan). Etapas 4 + 5 no hml (PR #10), aguardando o teste do Allan. **Etapa 6 no [PR #11](https://github.com/allannvictor/inscricoes/pull/11), AINDA NÃO pronto para o merge:** faltam 4 correções baixas da 6ª varredura de segurança e a 7ª varredura completa (ver **seção 5, "Para a próxima sessão"**). Agente de produto criado (PR #12, já no `staging`). Hospedagem comercial: discutir no futuro.
>
> **Regra:** atualizar este arquivo (e o `PLANO.md`, se o plano mudar) a cada andamento, no mesmo branch de trabalho.

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
- O merge é ele que faz. Depois do merge, o branch de trabalho recomeça do `staging`.

### Fluxo de branches (desde 13/11/2026)

```
claude/… (trabalho) ──PR──▶ staging (= homologação) ──PR──▶ main (= produção)
```

1. Cada etapa ou correção sai de um branch `claude/…` criado a partir do `staging`, e o PR vai **para o `staging`**.
2. O Allan faz o merge no `staging`, e a homologação (`hml.inscricoesfast.com.br`) passa a mostrar a mudança.
3. Testado e aprovado na homologação, abro um PR **`staging` → `main`**. O merge desse PR publica em produção.
4. Nunca fazer PR de `claude/…` direto para o `main`.

## 3. Ambientes e endereços

| | Produção | Homologação |
|---|---|---|
| Site | **https://www.inscricoesfast.com.br** (`inscricoesfast.com.br` redireciona) | **https://hml.inscricoesfast.com.br** |
| Também | `inscricoes-black.vercel.app` | `inscricoes-hml.vercel.app` |
| Publica a partir de | branch `main` (merge do PR `staging` → `main`) | branch **`staging`** (domínio `hml` fixo nele na Vercel), a cada merge |
| Banco (Neon) | branch `main` | branch `homologacao` (só via `DATABASE_URL_PREVIEW`) |
| Pix | Mercado Pago **real** (credencial de produção, API de **Orders**) | **simulado** (sem `MP_ACCESS_TOKEN` em Preview) |
| E-mail | Resend com domínio verificado (`nao-responda@inscricoesfast.com.br`) | Resend (se `EMAIL_FROM` estiver em Preview) |
| Acesso | **modo "em breve" ligado**: público vê "Em breve"; entra com `?acesso=<CHAVE_PRE_LANCAMENTO>` | **aberta a qualquer pessoa** (decisão de 13/11): Deployment Protection desligada, login com código por e-mail de verdade, sem código fixo e sem master. Faixa "ambiente de teste" no topo. Confirmar com `/api/status` |

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
  - Mercado Pago: `MP_ACCESS_TOKEN` (produção, conta da CF; só vale para o clube de `MP_CLUBE_DO_TOKEN`, padrão `cf-assessoria`), `MP_WEBHOOK_SECRET`;
  - etapa 6, a configurar: `MP_CLIENT_ID`, `MP_CLIENT_SECRET` (Conectar Mercado Pago de cada clube) e `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (Entrar com Google);
  - acesso: `ADMIN_EMAILS` (o e-mail do Allan = master), `PRE_LANCAMENTO=1`, `CHAVE_PRE_LANCAMENTO`;
  - arquivos: `BLOB_*`;
  - `PERMITIR_SIMULADO=1`. Ainda está ligado, mas não tem efeito com o token presente. **Remover antes do lançamento.**
- **Preview** (situação desejada depois da abertura ao público):
  - banco e sessão: `DATABASE_URL_PREVIEW`, `SESSION_SECRET` (outro valor);
  - modo teste: `PERMITIR_SIMULADO=1`, `RODAR_SEED=1`;
  - e-mail e site: `RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL=https://hml.inscricoesfast.com.br`;
  - arquivos: `BLOB_*`.
  - **Não devem existir em Preview:** `LOGIN_CODIGO_TESTE`, `PRE_LANCAMENTO`, `MP_ACCESS_TOKEN`.
  - **Etapa 6:** `ADMIN_EMAILS` volta para a Preview (com o e-mail do Allan), para ele testar "criar clube" como master. Isso é seguro agora, porque não há código fixo e o login é pelo e-mail de verdade. Para testar a conexão do Mercado Pago e o login com Google na homologação: `MP_CLIENT_ID`, `MP_CLIENT_SECRET`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
  - Para testar o painel na homologação, o Allan entra como **organizador** da CF, não como master. Para isso, `SEED_ORGANIZADOR_EMAIL` em Preview recebe o e-mail dele. O seed roda a cada deploy (`RODAR_SEED=1`) e o cadastra como organizador da CF.

## 4. Situação das etapas

| Etapa | Situação |
|---|---|
| 0. Protótipo | ✅ `docs/prototipo.html` |
| 1. Inscrição com Pix | ✅ em produção; Pix real de R$ 1 confirmado sozinho |
| 2. Painel do organizador | ✅ em produção (PR #4) |
| 3. Área do atleta | ✅ aprovada no hml (PRs #6 a #9). **Fica no `staging`**: o PR `staging` → `main` só quando o Allan pedir |
| **4. Identidade visual (layout novo)** | 🟡 feita junto com a 5 ([PR #10](https://github.com/allannvictor/inscricoes/pull/10), no `staging` e no hml); falta o teste do Allan (ver seção 6) |
| **5. Versão para computador (páginas do atleta)** | 🟡 idem |
| **6. Cadastro de clubes + login novo** | 🟡 [PR #11](https://github.com/allannvictor/inscricoes/pull/11) para o `staging`, **ainda não pronto**: faltam 4 correções baixas e a 7ª varredura (seção 5, "Para a próxima sessão") |
| 7. Uso real / lançamento | 🟡 parte feita (domínio, e-mail, Mercado Pago de produção); falta o resto, ver seção 7 |
| 8. Extras | ⏳ cartão, check-in com QR, lotes de preço por data, formulário em etapas… |
| 9. Plataforma aberta | ⏳ cadastro aberto de clubes, comissão da plataforma, página do clube, domínio próprio |

**Plano reordenado em 14/11:** o cadastro de clubes saiu da última etapa e virou a etapa 6, junto com o login novo. A decisão do Allan foi:
- o master cria os clubes;
- senha **opcional** mais "Entrar com Google";
- o código por e-mail continua valendo.

As etapas seguintes foram renumeradas (lançamento = 7, extras = 8, plataforma aberta = 9).

PRs anteriores, todos com merge feito:
- [#1](https://github.com/allannvictor/inscricoes/pull/1): etapa 1.
- [#2](https://github.com/allannvictor/inscricoes/pull/2): homologação com banco próprio.
- [#3](https://github.com/allannvictor/inscricoes/pull/3): modo "em breve".
- [#4](https://github.com/allannvictor/inscricoes/pull/4): etapa 2.

PR da etapa 3: o [#5](https://github.com/allannvictor/inscricoes/pull/5) (branch `claude/confident-thompson-3i2277`) foi **substituído** pelo [#6](https://github.com/allannvictor/inscricoes/pull/6) (branch `claude/inscricoes-fast-etapa-3-hum6h2` → `staging`), com o mesmo código mais estes docs. Motivo: a sessão nova só consegue enviar para o próprio branch. Fechar o #5 sem merge. O branch antigo ganhou depois um `CLAUDE.md` (instruções para toda sessão), que foi trazido para o `staging` e ajustado ao fluxo novo.

**Branch e homologação:** o branch `staging` foi criado em 13/11 a partir do `main`. Na Vercel, o domínio `hml.inscricoesfast.com.br` deve ficar fixo nele (Settings → Domains → Git Branch = `staging`).

## 5. Próximo passo imediato

### ⏭️ Para a próxima sessão (decidido pelo Allan em 14/11)

**Objetivo:** fechar o PR #11 (etapa 6).
1. Corrigir os 4 itens BAIXOS da **6ª varredura** de segurança (lista abaixo), com testes.
2. Rodar a **7ª varredura completa** com o agente `revisor-seguranca`.
3. Se sair LIBERADO, ou LIBERADO COM RESSALVAS só com itens já aceitos, avisar o Allan que o PR #11 está **pronto para o merge no `staging`**.

**Branch:**
- O trabalho está no branch `claude/inscricoes-fast-etapa-3-hum6h2` (PR #11 → `staging`), no commit `caf9c27`, que já inclui o PR #12.
- Se a nova sessão não puder enviar para esse branch, crie o branch dela **a partir de `origin/claude/inscricoes-fast-etapa-3-hum6h2`** e abra um PR novo para o `staging`, dizendo que ele **substitui o #11**. O Allan fecha o #11 sem merge, como foi feito com o #5 → #6.

**Os 4 achados da 6ª varredura** (todos BAIXOS; o agente provou cada um localmente):
1. **Consulta de CPF pelo "criar pedido" fura o limite de 60 por hora (LGPD).**
   - Onde: `src/lib/pedidos/servico.ts`, perto da mensagem "Já existe inscrição neste evento para o CPF…" (por volta das linhas 143 a 149). Ela sai antes de criar o pedido e não passa por `dentroDoLimite`.
   - Correção: antes de devolver esse erro, contar a tentativa em `dentroDoLimite('cpf:' + usuario.id, 60, 1h)`. Passado o limite, responder de forma genérica, sem dizer qual CPF.
   - Teste: 61 tentativas; a 61ª não revela o CPF.
2. **O campo `cupom` do pedido ainda aceita o caractere nulo** (dá erro no banco; o log sai protegido).
   - Onde: `pedidoSchema` em `src/lib/pedidos/validacao.ts`.
   - Correção: `.superRefine(semCaractereNulo)` ou a regra `^[A-Za-z0-9_-]{0,30}$`.
   - Teste: um caso a mais em `src/lib/pedidos/validacao.test.ts`.
3. **"Simular Pix" na homologação com clube conectado a uma conta real.**
   - O pedido nasce com o provedor provisório `'simulado'` (`src/lib/pedidos/servico.ts`, insert do pedido), e a rota `src/app/api/pedidos/[id]/simular/route.ts` só confere o comprador, o provedor e o ambiente.
   - `confirmarPagamento` também aceita pedidos `cancelado` e `expirado`.
   - Correção:
     - provedor provisório neutro (ex.: `'criando'`; conferir onde `provedor` é lido: tela do Pix, `sincronizarPagamento` e painel);
     - na rota, exigir `status === 'pendente'` e `situacaoDoPagamento(clube) === 'simulado'`.
   - Teste: da rota ou de banco.
4. **Entradas estranhas dão erro 500** (não vaza nada).
   - Id só com hifens passa em `^[0-9a-f-]{36}$`. Trocar por uma regra de UUID de verdade em:
     - `src/lib/pedidos/consultas.ts`;
     - `src/lib/atleta/consultas.ts`;
     - `src/lib/painel/acesso.ts`;
     - `ehUuid` em `src/app/acoes.ts`;
     - as checagens em `src/app/painel/acoes.ts` e em `src/app/api/pedidos/[id]/status/route.ts`.
   - `?erro=constructor` derruba `/entrar` e a página de Pagamento do painel. Usar `Object.hasOwn(ERROS, erro)`.
   - `?busca=a&busca=b` dá TypeError em `src/lib/painel/inscritos.ts`: aceitar só texto.
   - Webhook com o corpo `null` dá 500 antes da assinatura (`src/app/api/webhooks/mercadopago/route.ts`): tratar corpo que não é objeto.
   - Data inválida no evento ("2026-13-45T99:99") dá RangeError: `conferirEvento` (`src/lib/painel/evento-form.ts`) deve recusar datas inválidas.
   - Testes unitários dessas regras.

**Como verificar** (antes de pedir a varredura):
1. `service postgresql start`. Se o banco local der "Este cupom esgotou", recriar o banco e rodar migrate + seed.
2. `npm run lint`, `npm run typecheck` e `npm test` (os testes `*.db.test.ts` usam o Postgres).
3. `npm run build`, depois `E2E_PRODUCAO=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --trace off`, **duas vezes**.
4. No fim, desligar os servidores: `pkill -f next-server`.

**Como pedir a varredura:**
- Usar o agente `revisor-seguranca` com o escopo completo.
- Instruções que funcionaram nas rodadas anteriores:
  - não fazer checkout, stash nem commit;
  - scripts só no scratchpad;
  - provas só locais, com `next start`;
  - encerrar os servidores no fim.
- Trazer o veredito ao Allan em linguagem simples.

**Depois do merge do PR #11, pendências com o Allan:**
- configurar na Preview `ADMIN_EMAILS`, `MP_CLIENT_ID`/`MP_CLIENT_SECRET` (URL de retorno e PKCE no Mercado Pago) e `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`;
- testar a etapa 6 no hml;
- enviar uma imagem pelo painel, para conferir o `@vercel/blob` com o override do `zod`.

**Já aceito pelo Allan (não corrigir):** depois de uma transferência, quem comprou continua vendo o nome, o CPF mascarado e a categoria de quem recebeu.

1. ✅ **Homologação aberta ao público** (13/11):
   - sem login da Vercel, `homologacao: true`, código de teste desligado, e-mail via Resend e Pix simulado;
   - domínio `hml` com Git Branch = `staging`;
   - variáveis da Preview ajustadas (sem `LOGIN_CODIGO_TESTE` e sem `ADMIN_EMAILS`; com `SEED_ORGANIZADOR_EMAIL`).
2. 🟡 **Ajuste pedido pelo Allan nos testes da etapa 3** (13/11): "Minhas inscrições" estava misturada.
   - Agora tem 3 abas: **Inscrito** (provas futuras, confirmadas ou aguardando Pix; Pix pendente no topo), **Cancelados** (qualquer data, sem botões) e **Passadas** (provas que já aconteceram, com comprovante).
   - Cada prova vira **um cartão** com os participantes dentro. "Pagar com Pix" aparece uma vez por pedido.
   - Regras em `src/lib/atleta/abas.ts`, com testes.
   - [PR #8](https://github.com/allannvictor/inscricoes/pull/8) com merge no `staging` e publicado no hml (versão `6053d46`). Falta o Allan conferir.
3. 🟡 **Ajuste pedido pelo Allan (14/11): o sexo vem do cadastro, não é escolhido a cada inscrição.** Ele aprovou 3 itens:
   - **"Você" em resumo:** com cadastro completo para o evento, aparece um cartão (nome, CPF mascarado, nascimento, sexo, WhatsApp, camisa e categoria já calculada) com "Alterar". Só se escolhe a distância. Sem cadastro, os campos aparecem como antes e ficam salvos.
   - **Sexo só em evento com categoria:** sem categoria, o campo some do formulário e da transferência, e não é obrigatório. No banco, `inscricoes.sexo` passou a aceitar vazio (migração `0003_sexo_opcional`). Na planilha, fica em branco. A inscrição não apaga o sexo e a camisa que já estão no cadastro quando o evento não pergunta.
   - **"Quem você já inscreveu":** botões "+ Fulano" com as pessoas que a conta já inscreveu. Os dados vêm da inscrição mais recente de cada CPF (`pessoasJaInscritas` em `src/lib/atleta/consultas.ts`).
   - Regra única do que falta preencher: `src/lib/regras/participante.ts`, com testes.
   - [PR #9](https://github.com/allannvictor/inscricoes/pull/9) com merge no `staging` e publicado no hml (versão `9cb248c`; a migração `0003_sexo_opcional` foi aplicada no banco de homologação pelo deploy). Falta o Allan conferir.
4. ✅ Etapa 3 aprovada (14/11). O Allan decidiu **deixar no `staging`** por enquanto; o PR `staging` → `main` sai quando ele pedir.
5. 🟡 **Etapas 4 + 5 juntas** (autorizadas em 14/11, direção B + C do canvas): PR para o `staging`. PR #10 com merge no `staging` e publicado no hml (versão `012915a`; migração `0004_visual_do_clube` aplicada). Falta o teste do Allan (celular e computador). Detalhes na seção 6.
6. 🟡 **Etapa 6: cadastro de clubes + login novo** (autorizada em 14/11). [PR #11](https://github.com/allannvictor/inscricoes/pull/11) para o `staging`.
   - **Clubes:** em `/painel`, o master vê a lista de clubes (situação do Mercado Pago, organizadores, eventos publicados) e cria clubes em "+ Novo clube" (nome, endereço, cor, nome do preço especial e e-mail do 1º organizador). O organizador recebe um **convite por e-mail**, e o mesmo vale para quem é adicionado em Organizadores.
   - **Mercado Pago por clube (OAuth com PKCE):**
     - Painel → Pagamento → "Conectar Mercado Pago". Os tokens ficam criptografados (AES-GCM, chave derivada do `SESSION_SECRET`) e são renovados sozinhos quando faltam menos de 30 dias.
     - **Correção importante:** antes, um clube sem conta usaria o `MP_ACCESS_TOKEN` da CF. Agora o token do site só vale para o clube de `MP_CLUBE_DO_TOKEN` (padrão `cf-assessoria`).
     - **Publicar evento** exige conta conectada; fora da produção, o Pix simulado vale.
     - Migração `0005_etapa6_clubes_e_login`.
   - **Senha opcional** em Meus dados → Acesso: Argon2id (`@node-rs/argon2`), 5 erros a cada 15 minutos, "esqueci a senha" = código.
   - **Entrar com Google** (OpenID Connect com PKCE): liga a conta pelo e-mail verificado. O botão só aparece com `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`.
   - **Testes:**
     - os testes ponta a ponta agora rodam na **versão compilada** no CI (`next start` imitando a homologação, `E2E_PRODUCAO=1` localmente), porque o `next dev` dava falhas aleatórias com 14 testes em paralelo;
     - novos testes: criar clube e convite, e a senha opcional.
   - **Pendente com o Allan** (passo a passo na conversa de 14/11):
     - criar o cliente OAuth no Google Cloud;
     - pegar o Client ID e o Secret da aplicação do Mercado Pago, cadastrar as URLs de retorno e ligar o PKCE;
     - pôr as variáveis na Vercel (Preview primeiro);
     - recolocar `ADMIN_EMAILS` na Preview.

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

**Decisões (14/11):**
- Direção **B + C**, junto com a etapa 5 (computador).
- **Cor padrão neutra** da plataforma: o azul `#2563EB`. Cada clube pode trocar no Perfil do clube (`clubes.cor`); vazio = padrão. O texto do botão (branco ou escuro) e a cor de links e ícones são calculados para ter contraste (`src/lib/regras/cores.ts`).
- **Nome do preço especial** editável por clube no Perfil do clube (`clubes.nome_preco_especial`), até **20 letras**; vazio = "Sócio". Aparece como "Preço Aluno CF" no formulário, nos preços da página do evento, no Pix, no comprovante, no painel e na planilha.
- Ficou de fora: o **formulário em etapas** (Dados → Pagamento → Confirmado). Pode virar um ajuste depois.

**O que foi feito:**
- Fundo suave (`--color-fundo-pagina`) com cartões brancos; cabeçalho branco com a marca "Inscrições **Fast**".
- **Página do evento:** foto em destaque (sem foto, o topo usa a cor do clube); cartão flutuante com selos ("Inscrições abertas", "faltam X dias"), ícones de data, largada e local, "ver no mapa", "Adicionar à agenda" (arquivo `.ics` em `/eventos/[slug]/agenda.ics`) e "Compartilhar" (WhatsApp); distâncias com o preço especial; textos em sanfonas; organização; selo "Pagamento seguro com Pix via Mercado Pago".
  - Celular: barra fixa embaixo com "a partir de R$ X" e Inscrever-se.
  - Computador: distâncias e botão fixos na lateral direita.
- **Formulário:** no computador, o resumo do pedido (cupom, total, aceite, pagar) fica fixo na lateral.
- **Pix:** no computador, QR code grande (300 px) ao lado das instruções em 3 passos.
- **Página inicial:** grade de cartões (1, 2 ou 3 colunas), com foto, clube, data, local e selos.
- **Tema por clube** (`TemaClube`) na página do evento, inscrição, Pix, confirmação, comprovante e cartões da página inicial.
- **Testes:** os testes ponta a ponta rodam em dois tamanhos (projetos `celular` e `computador` 1366 px no `playwright.config.ts`). O teste do painel troca a cor do clube e confere a cor do botão.
- Migração `0004_visual_do_clube` (colunas `cor` e `nome_preco_especial` em `clubes`).

**Pendente com o Allan:** escolher a cor da CF e o nome do preço especial ("Aluno CF"?) no Perfil do clube, e subir a foto/logo em boa resolução.

## 7. Pendências e decisões em aberto

- **Revisão de segurança (14/11):** criado o agente `revisor-seguranca` (`.claude/agents/revisor-seguranca.md`). Ele roda **antes de todo PR `staging` → `main`** e dá o veredito Liberado / Com ressalvas / Bloqueado. A regra está no `CLAUDE.md`.
- **Achados da revisão manual de 14/11:** o Allan autorizou, e os itens 1 a 4 (mais um 5º, achado depois) foram **corrigidos no PR #11**:
  1. ✅ **Redirecionamento aberto em `voltar`** (`/\site.com`): agora todo destino passa por `destinoInterno` (`src/lib/regras/redirecionamento.ts`, com testes).
  2. ✅ **Troca da conta Mercado Pago:** e-mail para todos os organizadores do clube e para os masters ao conectar, trocar ou desconectar (`src/lib/pagamento/avisos.ts`).
  3. ✅ **Senha criada, trocada ou removida:** encerra as sessões nos outros aparelhos e manda um aviso por e-mail. Ligar a conta Google a uma conta existente também avisa.
  4. ✅ **Limite por IP** (só o hash do IP é guardado): 30 senhas erradas a cada 15 minutos e 20 códigos por hora.
  5. ✅ **Pix simulado em produção:** com `PERMITIR_SIMULADO=1` ainda ligado na produção, um clube que desconectasse o Mercado Pago depois de publicar teria Pix simulado, e o comprador poderia "simular" e se inscrever de graça. Agora `simuladoPermitido` é sempre falso com `VERCEL_ENV=production`.
- **Varredura completa do agente `revisor-seguranca` (14/11): veredito BLOQUEADO.** O Allan autorizou corrigir os graves, os médios e os reforços simples. Tudo foi **corrigido no PR #11**:
  - 🔴 **Roubo de inscrição pelo CPF:** quem digitasse o CPF de outra pessoa em Meus dados via e transferia a inscrição dela. Agora **o CPF não dá acesso**: só o comprador, o e-mail da inscrição (comprovado no login) e o organizador (`src/lib/auth/permissoes.ts`, `minhasInscricoes`). Há teste ponta a ponta do golpe.
  - 🔴 **Limite de tentativas do código de login burlável com tentativas simultâneas** (estava na produção desde a etapa 1). Agora a tentativa é reservada no banco de forma atômica, o código vale uma vez só e o pedido de códigos usa trava (`src/lib/auth/codigo-email.ts`).
  - 🔴 **O mesmo no limite de erros de senha.** A tentativa é registrada antes de conferir (`src/lib/auth/senha.ts`).
    - Os testes `src/lib/auth/limites.db.test.ts` usam o banco e disparam tentativas em paralelo.
    - No código antigo, passavam 20, 30 e 12 tentativas; agora, no máximo 5.
  - 🟠 **Redirecionamento com `/..//site`:** `destinoInterno` confere o resultado depois de normalizar.
  - 🟠 **Reserva de vagas sem limite:** no máximo 2 pedidos aguardando Pix por evento e 5 por conta (`src/lib/regras/limites-pedido.ts`).
  - 🟡 **Reforços:**
    - o modo "em breve" bloqueia POST (Server Actions);
    - consulta de CPF limitada (60 por hora por conta) e cupom só com login (20 tentativas por hora), com tabela `limites_uso` e `src/lib/limites.ts`;
    - webhook com comparação em tempo constante e `external_reference` obrigatório;
    - cabeçalhos de segurança (anti-clickjacking, nosniff, referrer);
    - e-mail em produção sem Resend falha em vez de ir para os logs;
    - o endereço da CF (`MP_CLUBE_DO_TOKEN`) fica reservado;
    - a planilha ganhou mais proteção contra fórmulas;
    - o upload confere os bytes do arquivo (`src/lib/tipo-arquivo.ts`);
    - o seed nunca roda em produção, usa `organizador@exemplo.invalid` e tira o antigo `organizador@exemplo.com` do clube;
    - o CI roda com permissão só de leitura e os testes de banco antes dos unitários.
- **Segunda varredura (14/11): de novo BLOQUEADO.** As correções anteriores foram confirmadas, mas apareceram novos achados, todos corrigidos no PR #11:
  - 🔴 **Vazamento depois de uma transferência:** quem comprou via no "+ Adicionar" os dados completos de quem recebeu a transferência. Agora as inscrições transferidas ficam fora de `pessoasJaInscritas`.
  - **Decisão do Allan:** uma inscrição só pode ser **transferida uma vez** (`podeTransferir` com `transferida`). A regra é conferida de novo dentro da transação, com a inscrição travada e a permissão reconferida.
  - **Decisão do Allan:** o **e-mail é obrigatório** do 2º participante em diante. Com ele, a pessoa vê a própria inscrição, já que o CPF não dá acesso.
  - 🟠 **Dava para encher o banco:** tentativas de senha e usos de `limites_uso` já bloqueados eram gravados. Agora a contagem e a gravação ficam numa transação com trava, e só o que passa é gravado. O e-mail aceita no máximo 254 caracteres, e registros com mais de 1 dia são apagados de vez em quando.
  - ⚠️ **Migração:** a `0005` tinha sido editada depois que a prévia do PR #11 aplicou a versão original no **banco da homologação**, e o deploy de prévia falhou. A `0005` voltou ao original, e as mudanças foram para a `0006_etapa6_seguranca`, escrita com `IF NOT EXISTS`. Simulado localmente: um banco com a `0005` original recebe a `0006` sem erro.
    - **Lição:** nunca editar uma migração que já foi para algum branch publicado na Vercel. Toda prévia aplica as migrações no banco da homologação.
  - 🟡 **Reforços:**
    - `/em-breve` e `/api/status` só aceitam leitura (GET) no modo "em breve";
    - no máximo 10 pessoas aguardando Pix por conta no mesmo evento;
    - testes de limite mais rigorosos: no mínimo 1 e no máximo 5 conferidas, código certo em paralelo abre 1 sessão só, bloqueadas não são gravadas, e os testes apagam o que criam.
- **Terceira varredura (14/11): LIBERADO COM RESSALVAS** (nada crítico nem alto). O Allan pediu para corrigir as ressalvas antes do merge, e foi feito no PR #11:
  - 🟠 **Encher o banco por campos sem tamanho máximo** (telefone, camisa, CPF, nascimento, e-mail da transferência). Agora todos têm máximo, no pedido, na transferência e em Meus dados. Testes em `src/lib/pedidos/validacao.test.ts`.
    - O formato da transferência foi para `src/lib/atleta/transferencia-schema.ts`.
  - 🟡 **Modo "em breve":** liberava qualquer endereço sob `/api/webhooks/`, e a página "não encontrado" executa as ações do site. Agora só o endereço exato `/api/webhooks/mercadopago`.
  - 🟡 **Inscrição cancelada voltava a valer** se o Pix fosse pago depois. Agora o pagamento só confirma as não canceladas; se todas estiverem canceladas, o pedido vira `pago_conflito` para a organização resolver. Teste de banco em `src/lib/pedidos/confirmacao.db.test.ts`, que falha no código antigo.
  - 🟡 **Códigos de evento ou usuário inválidos** em ações davam erro 500; agora dão uma resposta limpa.
  - **Decisão do Allan:** depois de uma transferência, quem comprou continua vendo o nome, o CPF mascarado e a categoria de quem recebeu. Os dados completos nunca aparecem.
- **Quarta varredura (14/11): LIBERADO COM RESSALVAS** (só baixos). O Allan pediu para corrigir e fazer nova varredura. Correções no PR #11:
  - **Modo "em breve" com duas travas:**
    - o middleware usa o caminho **bruto**, passa por quase tudo (`matcher` só exclui `/_next/static/`) e só libera o webhook para `POST` sem cabeçalho `next-action`;
    - como o Next "limpa" alguns endereços antes do middleware (ex.: `/_next/data/<build>/...`), as ações públicas de `src/app/acoes.ts` também conferem a chave (`src/lib/pre-lancamento-acoes.ts`).
    - **Provado com servidor real:** POST com a ação de login por 12 caminhos diferentes, sem a chave, gravou 0 códigos; com a chave, funciona.
  - **Logs sem dados pessoais:** `resumoDoErro` (`src/lib/log.ts`) no lugar do objeto do erro, que levava os valores da consulta (nome, CPF, telefone) para os logs da Vercel. As respostas do Mercado Pago e do Resend também não vão mais inteiras para o log.
  - O caractere nulo é recusado nos formulários do atleta (`src/lib/regras/texto.ts`).
  - **Painel com limites:**
    - e-mail do perfil e dos organizadores com até 254 caracteres;
    - lista de sócios com até 5.000 pessoas, e nome do sócio cortado em 200 caracteres;
    - vagas e limite do cupom com até 6 dígitos;
    - preço com até 7 dígitos.
  - **Ações públicas** conferem o tipo dos valores: tipo errado vira uma resposta neutra, sem erro 500.
  - O teste ponta a ponta de inscrição tira o limite do cupom `AMIGO10`, para não esgotar no banco local.
- **Quinta varredura (14/11): LIBERADO COM RESSALVAS** (3 baixos). O Allan pediu para corrigir e fazer outra varredura completa. Correções no PR #11:
  - **Caractere nulo e de controle:**
    - recusados nas ações públicas (`emailValido` e `ehTexto` usam `CONTROLE`);
    - `semCaractereNulo` agora olha dentro de listas e objetos e vale também nos formulários do painel: evento, distâncias, cupom, perfil e novo clube;
    - na lista de sócios, a busca de inscritos limpa esses caracteres, e `removerSocioAcao` confere o tipo.
  - **Rede de segurança dos logs:** `src/instrumentation.ts` liga `protegerLogs` (`src/lib/log-protegido.ts`). Qualquer erro do banco com valores, mesmo os que o próprio Next registra, vira o resumo sem dados.
  - **Valor do cupom:** `VALOR_CUPOM` em `src/lib/regras/cupom.ts`, sem `1e10`, `0x10` nem números gigantes.
  - **Dependências:** `overrides` no `package.json` (`postcss` do `next` ≥ 8.5.33 e um único `zod`). O `npm audit --omit=dev` agora dá **0 vulnerabilidades**.
  - **PR #12** (agente de produto) juntado ao branch, com o conflito do `CONTINUACAO.md` resolvido.
- **Sexta varredura completa (14/11): LIBERADO COM RESSALVAS** (4 baixos).
  - Confirmados com provas locais: as correções da 5ª, a rede de segurança dos logs (zero dados pessoais em 4 caminhos de erro do banco), o modo "em breve" fechado por 14 caminhos e o `npm audit` com 0.
  - Os 4 baixos estão listados em **"Para a próxima sessão"** (seção 5).
  - **Ainda em aberto:**
    - **Master sem segundo fator.** Avaliar TOTP ou exigir Google para o master.
    - **Criar ou trocar a senha não pede confirmação** (há aviso por e-mail e as outras sessões caem).
    - **`npm audit`:** ✅ resolvido na 5ª varredura com `overrides`. Ao atualizar o `next` ou o `@vercel/blob`, conferir se os `overrides` ainda são necessários.
    - **Actions do CI fixadas por SHA.**
    - **Vercel Firewall:** limite de requisições como reforço.

- **Etapa 7 (lançamento):**
  - decidir a **hospedagem comercial**: o plano Hobby da Vercel é para uso não comercial. Recomendação de 14/11: **Vercel Pro** (cerca de US$ 20 por mês; nada muda no projeto). Outras opções avaliadas: Netlify, Cloudflare Workers e Fly.io. O Allan pediu para **discutir no futuro**;
  - avaliar o plano pago do Resend (o gratuito tem limite de 100 e-mails por dia);
  - **antes de criar clubes reais em produção:** remover `PERMITIR_SIMULADO` da produção (com ele ligado, um clube sem conta conectada teria Pix simulado; publicar já está bloqueado, mas é melhor tirar);
  - remover `PERMITIR_SIMULADO` da produção;
  - desligar o modo "em breve" (apagar `PRE_LANCAMENTO`) no dia do lançamento;
  - conferir se a **URL do webhook de produção no Mercado Pago** foi trocada para `https://www.inscricoesfast.com.br/api/webhooks/mercadopago`, tópico **Order**. Foi pedido ao Allan, mas não está confirmado;
  - desativar o cupom de teste `TESTE1REAL` em produção, se ainda não foi (`update cupons set ativo=false where codigo='TESTE1REAL'`).
- **Homologação para testadores:** ✅ decidido em 13/11: aberta a qualquer pessoa, com e-mail de verdade, sem código fixo e sem master (passo a passo na seção 5). Aplicado e conferido pelo `/api/status`, e o domínio já publica o `staging` ✅.
- **"Aluno CF" em vez de "sócio":** ✅ feito na etapa 4 (campo no Perfil do clube).
- **Seguro atleta:** o site antigo (inscricoes.com.br) oferecia. Precisaria de uma seguradora parceira; fica para depois.
- **Página inicial:** ✅ grade de eventos na etapa 4 + 5.
- **Agente de produto (14/11):** criado o `especialista-produto` (`.claude/agents/especialista-produto.md`), com a memória em `docs/produto/` (estratégia, mercado, backlog de 18 oportunidades pontuadas e radares semanais).
  - Ele só propõe; nada do backlog entra no plano sem o Allan aprovar.
  - **Rotina semanal (decidida em 14/11):** toda **segunda às 7h40** (horário de Brasília), uma tarefa agendada ("Radar semanal de produto") abre uma sessão nova, roda o agente no modo radar e abre um **PR para o `staging`** só com `docs/produto/`. Também avisa por notificação no celular.
    - **Atenção:** a tarefa foi criada sem os conectores (GitHub). Se a sessão da segunda não conseguir enviar o branch ou abrir o PR, recriar a tarefa pela tela de tarefas agendadas do claude.ai, com o repositório `allannvictor/inscricoes` e o GitHub marcados.
  - **Rede do ambiente (14/11):** os sites dos concorrentes foram liberados no ambiente "Projetos" (ticketsports, sympla, minhasinscricoes, centraldacorrida, haid e runsignup, com e sem `www`), e o agente consegue abrir as páginas deles. Para pesquisar outro site, é preciso liberar o endereço do mesmo jeito.

## 8. Dicas técnicas para a próxima sessão

- **Stack:** Next.js 15 (App Router), TypeScript, Tailwind 4, Drizzle + Postgres (Neon), Zod, Resend, Mercado Pago (API de Orders), Vercel Blob, Vitest e Playwright.
- **Local:** Postgres 16 instalado no container (`service postgresql start`; ele **para sozinho** quando a sessão reinicia). Usuário, senha e banco são `inscricoes`. Rodar `npm run db:migrate` e `npm run db:seed`. O `.env.local` tem `LOGIN_CODIGO_TESTE=123456`.
- **Testes:**
  - `npm test` (130 testes; os de `*.db.test.ts` precisam do Postgres local ligado e migrado);
  - ponta a ponta (8 testes × 2 tamanhos de tela = 16): `npm run build` e depois `E2E_PRODUCAO=1 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --trace off` (estável, como no CI). Sem `E2E_PRODUCAO`, usa `next dev`, que pode falhar aleatoriamente. Se der "Este cupom esgotou", o banco local acumulou testes: recriar o banco e rodar migrate + seed;
  - `npm run lint`, `npm run typecheck` e `npm run build`;
  - o CI do GitHub roda tudo a cada push.
- **Migrações:** editar `src/db/schema.ts` → `npx drizzle-kit generate --name <nome>` → `npm run db:migrate`. Na Vercel, o `vercel-build` aplica as migrações sozinho.
- **Login nos testes:** limite de 5 códigos por hora por e-mail. Com `LOGIN_CODIGO_TESTE` (só fora de produção ou em Preview), nenhum e-mail é enviado.
- **Subconsultas com `sql`:** escrever a coluna qualificada (`"eventos"."id"`), não `${eventos.id}`. O Drizzle gera `"id"` sem tabela, o que causa erro ou contagem errada.
- **Rede da sessão:** o ambiente da sessão tem hosts liberados (domínios do site, docs do Mercado Pago). A homologação pede o login da Vercel, então não dá para testá-la daqui enquanto a proteção estiver ligada.
- **Regras de negócio importantes:** em `src/lib/regras/` (preço, meia 60+, sócio, cupom, categoria, CPF, transferência) e em `src/lib/auth/permissoes.ts`, todas com testes.

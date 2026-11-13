# Inscrições Fast: instruções para o Claude

Site de inscrições para simulados e provas de corrida. O primeiro clube é a CF Assessoria Esportiva.

## Antes de qualquer coisa, em toda sessão

1. Leia **`docs/CONTINUACAO.md`**: onde paramos, ambientes, variáveis (só nomes), pendências e dicas técnicas.
2. Leia **`docs/PLANO.md`**: plano completo, por etapas.
3. Consulte **`README.md`** para saber como rodar, testar e onde mexer em cada coisa.
4. Confira no GitHub (`allannvictor/inscricoes`) quais PRs estão abertos ou já tiveram merge, para não repetir nem atropelar trabalho.

Comece a conversa com um resumo curto da situação e do próximo passo.

## Como trabalhar com o Allan (dono do projeto)

- **Converse em português**, com linguagem simples e passo a passo. Ele configura Vercel, Neon, Resend, Mercado Pago e Registro.br pela tela, mandando prints.
- **Uma etapa por vez.** Só comece uma etapa quando ele autorizar. No fim de cada etapa, pare, mostre o resultado e **abra um PR para o `staging`**.
- **Fluxo de branches:** `claude/…` (trabalho) → PR para o **`staging`** (= homologação, `https://hml.inscricoesfast.com.br`) → depois de testado, PR **`staging` → `main`** (= produção). Nunca abra PR de `claude/…` direto para o `main`.
- **Homologação antes da produção.** Diga claramente quando um PR está **"pronto para o merge"** e quando ainda não está. O merge é ele que faz.
- **Mudança no plano no meio de uma etapa: pergunte antes.**
- **Nunca peça segredos no chat** (tokens, senhas, chaves). Eles vão direto nas variáveis da Vercel.
- **Depois do merge de um PR,** recomece o branch de trabalho a partir do `staging` atualizado.

## Mantenha os arquivos de acompanhamento em dia

Esses arquivos são a memória do projeto entre sessões. **Atualize-os no mesmo PR do trabalho:**

- **`docs/CONTINUACAO.md`:** atualize ao fim de cada etapa, ao abrir ou depois do merge de um PR, quando uma pendência for resolvida ou surgir, e quando mudar um ambiente ou uma variável (só o nome, nunca o valor). Atualize também a data no topo.
- **`docs/PLANO.md`:** atualize quando o Allan aprovar mudanças de escopo, como etapas novas, renumeradas ou decisões novas.
- **`README.md`:** atualize a tabela de situação das etapas, os passos para rodar e a tabela "Onde mexer em cada coisa".

Se a sessão estiver perto do fim, ou o Allan avisar que vai abrir outra, atualize o `docs/CONTINUACAO.md` antes de encerrar.

## Regras técnicas que já custaram caro

- Valores em dinheiro são sempre em **centavos** (inteiros).
- As regras de negócio ficam em `src/lib/regras/` e as permissões em `src/lib/auth/permissoes.ts`. **Toda mudança nelas vem com teste.**
- Toda página e ação do painel confere a permissão no servidor (`src/lib/painel/acesso.ts`). Quem não tem acesso vê 404.
- Em subconsultas com `sql`, escreva a coluna com a tabela (`"eventos"."id"`), não `${eventos.id}`.
- Prévias e homologação **nunca** usam o banco de produção: só `DATABASE_URL_PREVIEW` (veja `src/db/url.ts`).
- O código fixo de login (`LOGIN_CODIGO_TESTE`) **nunca** vale em produção (veja `src/lib/ambiente.ts`).
- Antes de abrir PR, rode `npm run lint`, `npm run typecheck`, `npm test` e os testes de ponta a ponta (`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test --trace off`, com o Postgres local ligado: `service postgresql start`).
- Não coloque identificadores de modelo de IA em commits, PRs ou código.

# Plano: site de inscrições para simulados (CF Assessoria Esportiva)

## Contexto

Hoje a CF Assessoria Esportiva usa o inscricoes.com.br, que é confuso: a home parece um shopping de provas, o cadastro vem antes de escolher a distância e as categorias misturam distância com sexo. A meta é um site simples e direto, como foi o pedido de camisas do Avia Mininu. O primeiro uso é o clube como cobaia nos simulados, e depois o site abre para outros clubes.

O protótipo foi aprovado em conversa: `docs/prototipo.html` no repositório e no link do artifact. Este plano transforma o protótipo em um site real, por etapas. Cada etapa termina com algo usável.

## Decisões já tomadas

- **Dinheiro:** cai direto na conta Mercado Pago do clube (split). A plataforma nunca segura valores.
- **Pagamento:** Pix primeiro. O cartão fica preparado para ligar depois.
- **Login do atleta:** e-mail mais código de 6 dígitos, sem senha. A conta nasce na primeira inscrição.
- **Pedido:** vários participantes no mesmo pedido e no mesmo Pix.
- **Preços:**
  - preço por distância;
  - preço de sócio opcional por evento, pela lista de CPFs do clube;
  - meia automática para quem tem 60 anos ou mais (Estatuto da Pessoa Idosa).
  - Os descontos não acumulam: vale o menor preço. O cupom vale só para quem paga preço cheio.
- **Sem reembolso.** O próprio atleta transfere a inscrição até a data definida pelo organizador.
- **Visual:** sempre com fundo branco e uma só cor de destaque. O limite de vagas não aparece para o atleta.
- **Imagens:** cada evento tem uma imagem de capa, também usada na prévia do link no WhatsApp. O clube tem foto ou logo no perfil.
- **E-mail:** a confirmação vai por e-mail. O endereço inicial é o gratuito da Vercel, e o domínio fica para depois.

---

## Stack e tecnologias

| Camada | Tecnologia | Por quê |
|---|---|---|
| Framework | **Next.js 15** (App Router, Server Actions) + **React 19** | Site público e painel no mesmo projeto. Páginas rápidas no celular e boa prévia de link (Open Graph). |
| Linguagem | **TypeScript** | Menos erros de cálculo em preços e regras. |
| Estilo | **Tailwind CSS 4** | Reproduz o visual do protótipo com pouco CSS próprio. |
| Banco de dados | **Postgres no Neon** (plano gratuito) | Não pausa como o Supabase e "acorda" sozinho. Tem um branch de banco separado para testes. |
| Acesso ao banco | **Drizzle ORM** + driver `postgres` | Tabelas tipadas e migrações versionadas no git. Funciona igual no Postgres local e no Neon. |
| Validação | **Zod** | Valida formulário e API com as mesmas regras (CPF, datas, campos obrigatórios). |
| Login | **Próprio:** código por e-mail e sessão em cookie | É simples e evita depender de um serviço de autenticação. O código fica salvo com hash, expira em 10 minutos e aceita no máximo 5 tentativas. A sessão dura 30 dias. |
| E-mail | **Resend** (gratuito até 3 mil por mês) | Envia o código de login e a confirmação. Em desenvolvimento, os e-mails aparecem no terminal. |
| Pagamento | **Mercado Pago**: API de Pagamentos (Pix), Webhooks e OAuth | Pix com QR code e confirmação automática. O OAuth conecta a conta do clube. |
| Arquivos | **Vercel Blob** | Imagem do evento, foto do clube e regulamento em PDF. |
| Hospedagem | **Vercel** | Publica sozinho a cada push no GitHub e dá um endereço gratuito `*.vercel.app`. |
| Testes | **Vitest** para as regras de preço e idade, **Playwright** para o fluxo completo | Garante que meia, sócio, cupom e vagas calculem certo. |
| Qualidade | ESLint + `tsc` + GitHub Actions | Roda a cada push. |

**Por que TypeScript, e não C#:** C# também funcionaria, mas não roda na Vercel. Seriam outra hospedagem (paga, ou gratuita que "dorme") e, no caso de API separada, dois projetos. Ficamos com TypeScript de ponta a ponta. Como você também quer entender e ajustar o código, o projeto segue estas regras:
- nomes de tabelas, funções de regra de negócio e comentários em **português**;
- regras de preço e permissão em arquivos pequenos e testados;
- um `README` com o passo a passo para rodar localmente e onde mexer em cada coisa.

A sintaxe do TypeScript é parecida com a do C# (tipos, classes, async/await).

**Atenção na hospedagem:** o plano gratuito da Vercel (Hobby) é para uso não comercial. Ele serve para desenvolver e testar. Antes de receber inscrições pagas de verdade (etapa 5), decidimos entre o Vercel Pro (US$ 20 por mês) e outra hospedagem com plano gratuito que aceite uso comercial, como Netlify ou Cloudflare. O código não muda.

**Custo mensal estimado no início:** R$ 0 de infraestrutura, mais as taxas do Mercado Pago (cerca de 1% no Pix). Essa taxa fica com o Mercado Pago, não com o site.

## Receita da plataforma (o que o site ganha)

- **Onde se define:** cada clube tem uma comissão configurada (`clubes.comissao_tipo` em % ou R$, mais `clubes.comissao_valor`). Quem configura é só o dono da plataforma, por um painel de administrador na etapa 7.
- **Como se cobra:** a comissão vai no campo `application_fee` do pagamento no Mercado Pago (modelo marketplace). No mesmo Pix, o valor da comissão cai na conta da plataforma e o resto na conta do clube, sem repasse manual.
- **Quem paga** (opção por evento, `eventos.taxa_paga_por`):
  - o **atleta**: aparece uma "taxa de serviço" somada ao total;
  - ou o **clube**: sai do valor que o clube recebe.
- **O que fica registrado:** cada pedido guarda `taxa_plataforma` e `taxa_gateway`, para um relatório de quanto o site ganhou por evento e por mês.
- **Etapa 1 (só a CF):** comissão zero e sem split. O pagamento é criado direto na conta do clube. As colunas já nascem no banco, então ligar a comissão depois é só configuração.
- **Sugestão para quando abrir a outros clubes:** cobrar abaixo do mercado (que fica entre 7% e 10%), por exemplo 5% ou R$ 2 fixo por inscrição, pago pelo atleta. A plataforma vai precisar de MEI ou CNPJ para emitir nota da comissão.

---

## Modelo de dados (Postgres)

- `clubes`: nome, slug, foto, WhatsApp, Instagram, e-mail, tokens do Mercado Pago (OAuth, guardados criptografados) e se o Mercado Pago está conectado.
- `usuarios`: e-mail (único), nome, CPF, nascimento, sexo, telefone, camisa e contato de emergência. É o atleta, e o organizador também é um usuário.
  - Já nasce com a coluna `senha_hash` (opcional e sem uso por enquanto).
  - O login fica isolado em `src/lib/auth/`, com um "método" por arquivo (`codigo-email.ts`).
  - Para ligar a senha no futuro, basta criar `senha.ts` (hash com Argon2) e a tela "Criar senha" em Meus dados, sem mudar o banco nem o resto.
  - Entrar com Google entra do mesmo jeito.
- `organizadores`: liga clube e usuário, com o papel de cada um.
- `codigos_login`: e-mail, hash do código, validade e tentativas.
- `sessoes`: token (hash), usuário e validade.
- `eventos`: clube, slug, nome, data e hora, local, kit e texto, capa, regulamento, prazo de inscrição, prazo de transferência, status (rascunho, publicado ou encerrado), `preco_socio_ativo`, `pede_camisa` e `usa_categoria`.
- `distancias`: evento, nome, preço em centavos, preço de sócio (opcional), limite de vagas (opcional) e ordem.
- `socios`: clube e CPF (chave única), mais o nome.
- `cupons`: evento, código, tipo (% ou R$), valor, limite e quantidade de usos.
- `pedidos`: evento, comprador, total, cupom, status (pendente, pago, expirado ou cancelado), id do pagamento no Mercado Pago, dados do Pix, validade de 30 minutos e data do pagamento.
- `inscricoes`: pedido, evento, distância, os dados do participante (copiados no momento da inscrição), preço pago, motivo do desconto (nenhum, sócio, meia 60+ ou cupom), categoria, status e número.
  - Índice único `(evento, cpf)` para inscrições ativas, que impede inscrição duplicada.
- `transferencias`: inscrição, dados antigos, quem fez e quando.

**Vagas:** contam as inscrições pagas mais as pendentes dentro do prazo. A reserva é feita numa transação que trava a linha da distância, para nunca vender além do limite. O pedido pendente que vence é marcado como expirado quando alguém consulta. Não precisa de tarefa agendada.

## Rotas

**Público:**
- `/eventos/[slug]`: página do evento.
- `/eventos/[slug]/inscricao`: login, participantes e cupom.
- `/pedidos/[id]`: Pix com atualização automática, e depois a confirmação.
- `/entrar` e `/minhas-inscricoes`.
- `/inscricoes/[id]/transferir`.

**Painel:**
- `/painel`: lista de eventos.
- `/painel/eventos/novo`.
- `/painel/eventos/[id]/inscritos`, `/editar` e `/cupons`.
- `/painel/socios`, `/painel/perfil` e `/painel/pagamento`.

**API:**
- `/api/webhooks/mercadopago`
- `/api/pedidos/[id]/status`, consultado pela tela do Pix.
- `/api/mercadopago/oauth/callback`
- `/api/inscritos.csv`

## Quem pode ver o quê (privacidade e LGPD)

Toda página e API confere a permissão no servidor. Esconder um botão não basta. As regras ficam em `src/lib/auth/permissoes.ts`, com testes.

- **Pedido** (`/pedidos/[id]`):
  - O id é um UUID aleatório, impossível de adivinhar, e não um número sequencial.
  - Mesmo com o link, só abre para:
    - o **comprador** logado;
    - o **organizador do clube** dono do evento.
  - Qualquer outra pessoa recebe "Pedido não encontrado" (404). Não dizemos se o pedido existe.
- **Inscrição e comprovante:** abrem para o comprador e para o participante cujo **CPF ou e-mail** está na inscrição, logado com a própria conta. O organizador do clube também acessa. O participante vê só a própria inscrição, não as outras do mesmo pedido.
- **Transferência:** só o comprador ou o próprio participante, e dentro do prazo.
- **Painel e planilha de inscritos:** só organizadores daquele clube. Um clube nunca vê dados de outro clube.
- **Dados sensíveis:** o CPF aparece mascarado (`***.456.789-**`) fora do painel. O token do Mercado Pago fica criptografado no banco. Os links dos e-mails levam ao login por código, nunca a uma página aberta.
- **Testes de segurança:**
  - outro usuário logado tenta abrir o pedido e recebe 404;
  - organizador do clube A tenta abrir evento do clube B e recebe 404.

## Regras de negócio (ficam em `src/lib/regras/`, com testes)

- `preco(participante, distancia, evento)`: o menor valor entre cheio, sócio (se o evento tiver preço de sócio e o CPF estiver na lista) e meia (cheio ÷ 2, se a pessoa tiver 60 anos ou mais na data da inscrição).
- `aplicarCupom(pedido)`: desconta só dos participantes que pagam preço cheio.
- `categoria(nascimento, sexo, dataEvento)`: faixas até 17, 18–29, 30–39, 40–49, 50–59 e 60+.
- `validarCpf()`: confere os dígitos verificadores.
- `podeTransferir(inscricao, hoje)`.

---

## Etapas

**Como vamos andar:** aprovar este plano autoriza **só a etapa 1**. No fim de cada etapa eu paro e mostro o resultado: o que foi feito, como testar, o link da prévia e o que ficou pendente. A etapa seguinte só começa quando você autorizar explicitamente. Se algo no plano precisar mudar no meio de uma etapa, eu pergunto antes.

### Etapa 1: Inscrição com Pix
1. Base do projeto: Next.js, Tailwind, Drizzle, Zod, ESLint e Vitest. Migrações iniciais e dados de exemplo (o clube CF e um Simulado 10K).
2. Regras de negócio, com testes unitários.
3. Login por código: envio, verificação e sessão.
4. Página do evento.
5. Formulário com vários participantes, CPF primeiro, preço calculado na hora e cupom.
6. Pedido e Pix:
   - cria o pagamento no Mercado Pago com `X-Idempotency-Key` e `external_reference` igual ao id do pedido;
   - mostra o QR code e o copia e cola;
   - consulta o status a cada 5 segundos.
7. Webhook do Mercado Pago:
   - valida a assinatura `x-signature`;
   - busca o pagamento de novo pela API;
   - marca o pedido como pago;
   - numera as inscrições;
   - envia o e-mail de confirmação.
8. Modo simulado quando não há token do Mercado Pago, com o botão "Simular Pix recebido". Serve para desenvolver e testar sem dinheiro.

**Pronto quando:** uma inscrição de teste com 2 participantes for paga com Pix de R$ 1 na conta real do clube e confirmada sozinha.

### Etapa 2: Painel básico
- Login do organizador, com o mesmo código por e-mail.
- Lista de eventos.
- Criar e editar evento: distâncias, preço de sócio liga/desliga, campos, capa e regulamento.
- Inscritos: resumo, filtros e busca, cancelamento e planilha CSV/Excel.
- Sócios: colar da planilha.
- Perfil do clube com foto.
- Conectar o Mercado Pago (OAuth).

**Pronto quando:** você cadastrar e publicar o próximo simulado sozinho.

### Etapa 3: Área do atleta
- Minhas inscrições: as próprias e as feitas no seu CPF por outra pessoa.
- Comprovante.
- Transferência pelo próprio atleta.
- Meus dados.

**Pronto quando:** um atleta transferir a inscrição sem chamar a organização.

### Etapa 4: Versão para computador
Hoje todas as telas são desenhadas para o celular (uma coluna estreita, também no computador). Nesta etapa:
- **Página do evento:** em tela larga, a imagem e as informações ficam lado a lado, e o resumo com o botão "Inscrever-se" fica fixo na lateral.
- **Formulário:** os participantes ocupam a coluna principal, e o resumo do pedido (total, cupom, pagar) fica fixo na lateral.
- **Tela do Pix:** o QR code aparece grande ao lado das instruções, para quem paga escaneando a tela do computador com o celular.
- **Painel do organizador:** tabela de inscritos larga, com mais colunas visíveis, filtros na lateral e atalhos de teclado na busca.
- **Página inicial:** grade de eventos em vez de lista.
- O celular continua sendo a prioridade: nada muda no layout atual de telas pequenas.

**Pronto quando:** o fluxo inteiro (evento → inscrição → Pix → painel) ficar bom num monitor de 1366 px ou mais, e o teste automático rodar também nesse tamanho de tela.

### Etapa 5: Uso real
- Decidir a hospedagem comercial.
- Configurar o Mercado Pago de produção e o Resend com remetente próprio.
- Rodar um simulado real e ajustar o que aparecer.

### Etapa 6: Extras, conforme a necessidade
Cartão de crédito, check-in no dia com QR code, lotes de preço por data, cupons avançados e duplicar evento.

### Etapa 7: Outros clubes
- Cadastro de clubes.
- Cada clube conecta o próprio Mercado Pago, com a comissão automática da plataforma (`application_fee`).
- Página do clube.
- Domínio próprio. A plataforma vai precisar de MEI ou CNPJ para cobrar comissão.

---

## Estrutura de pastas (resumo)

```
src/
  app/            rotas (público, painel, api)
  components/     botões, campos, cartões (visual do protótipo)
  db/             schema.ts (Drizzle), migrations/, seed.ts
  lib/regras/     preço, cupom, categoria, CPF, transferência (+ testes)
  lib/auth/       código por e-mail, sessão
  lib/pagamento/  mercadopago.ts (Pix, webhook, OAuth), simulado.ts
  lib/email/      envio + modelos (código, confirmação, transferência)
docs/prototipo.html
```

## Variáveis de ambiente

`DATABASE_URL`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `MP_ACCESS_TOKEN` (etapa 1, conta do clube), `MP_CLIENT_ID`/`MP_CLIENT_SECRET` (OAuth, etapa 2), `MP_WEBHOOK_SECRET`, `BLOB_READ_WRITE_TOKEN`, `APP_URL`.

## Testar com o seu Mercado Pago

Sim, dá para testar com a sua conta. São três níveis, do mais seguro ao real:

1. **Modo simulado (sem Mercado Pago).** Não precisa de credencial. O botão "Simular Pix recebido" percorre o fluxo inteiro: confirmação, e-mail e painel. Serve para testar tudo menos o banco.
2. **Credenciais de teste da sua conta.**
   - **Configuração:** em mercadopago.com.br/developers → Suas integrações → Criar aplicação (tipo "Pagamentos online", produto "Checkout Transparente"). A aplicação gera um **Access Token de teste** e as **contas de teste** (vendedor e comprador).
   - **O que confirma:**
     - o site cria o Pix de verdade na API;
     - aparece o QR code;
     - o webhook chega ao site.
   - **Limite:** o QR code de teste não pode ser pago com um banco real. A aprovação nesse modo depende do que o sandbox do Mercado Pago permitir para Pix, e isso vamos confirmar no momento.
3. **Pix real de R$ 1** com as credenciais de produção da conta do clube.
   - Você paga do seu banco pessoal. Use, como comprador, um **e-mail diferente** do e-mail da conta Mercado Pago que recebe, porque o Mercado Pago recusa pagador igual ao recebedor.
   - O dinheiro cai na conta do clube, menos a taxa de cerca de 1%.
   - É o teste que fecha a etapa 1.

Os tokens (teste e produção) **não** devem ser colados no chat. Eu abro um formulário seguro para salvá-los no ambiente, e eles também vão para as variáveis da Vercel.

---

## Clonar na sua máquina (C:\workspace)

Esta sessão roda na nuvem e não tem acesso ao seu computador. Para clonar, rode no PowerShell ou no Git Bash:

```
cd C:\workspace
git clone https://github.com/allannvictor/inscricoes.git
cd inscricoes
git checkout claude/confident-thompson-3i2277
```

Para rodar depois da etapa 1, você vai precisar do Node.js 22 e de um `.env.local` (vou deixar um `.env.example`). Também vale criar um branch de desenvolvimento no Neon, e assim não precisa instalar Postgres. Depois:

```
npm install
npm run db:migrate
npm run dev
```

## Verificação (a cada etapa)

- `npm run lint`, `npm run typecheck` e `npm test`: regras de preço (meia, sócio, cupom, sem acumular), categoria, CPF e vagas.
- Playwright: página do evento → código → 2 participantes → Pix simulado → confirmação → minhas inscrições.
- Teste manual no celular, numa prévia da Vercel publicada a cada push.
- Etapa 1, com o Mercado Pago em modo de teste: o webhook recebido marca o pedido como pago e o e-mail chega. Depois, um Pix real de R$ 1.
- Permissões: testes automáticos para "outro usuário abre meu pedido" e para "organizador de outro clube abre meus inscritos". Os dois têm que dar 404.

# Guia: passar tudo para a empresa (CNPJ) no futuro

Dúvida do Allan (15/11/2026): hoje tudo está na conta pessoal dele. Dá para passar para uma empresa depois? **Sim.** Abaixo, como fica cada serviço.
Quando chegar a hora, confira as telas atuais de cada serviço, porque elas mudam.

| Serviço | Como migrar | Os atletas e clubes percebem? |
|---|---|---|
| **GitHub** (código) | Criar uma **organização** e **transferir o repositório**. Histórico e PRs vão junto. | Não |
| **Vercel** (hospedagem) | Criar um **time** (o plano Pro já é por time) e **transferir o projeto**. Domínios e variáveis vão junto. | Não |
| **Neon** (banco) | Transferir o projeto para uma organização. Os dados não mudam. | Não |
| **Registro.br** (domínio) | **Transferência de titularidade** do CPF para o CNPJ. | Não |
| **Resend** (e-mails) | Adicionar o novo dono ao time ou criar uma conta da empresa e conferir o domínio de novo (DNS). | Não |
| **Google Cloud** ("Entrar com Google") | Ou **trocar o dono**: em IAM, adicionar a conta da empresa como **Proprietário** e depois remover a pessoal. Ou **mover o projeto** para uma organização da empresa (Google Workspace, ou Cloud Identity Free com o domínio `inscricoesfast.com.br`). Trocar os e-mails de suporte e contato da tela de consentimento. | Não: as credenciais são do projeto e continuam iguais |
| **Mercado Pago** (aplicação do site) | ⚠️ A aplicação (`MP_CLIENT_ID`/`MP_CLIENT_SECRET`) fica presa à conta que a criou. É preciso criar uma **aplicação nova na conta do CNPJ** (mesmas URLs de redirecionamento e PKCE), trocar as variáveis na Vercel e **cada clube clicar em "Conectar Mercado Pago" de novo**. | Os organizadores, sim: um clique por clube. O dinheiro dos clubes nunca passa pela conta da plataforma |

## Recomendações
- **A comissão da plataforma (etapa 9) exige a aplicação do Mercado Pago na conta do CNPJ**, que é quem recebe a comissão. Por isso, o melhor é migrar o Mercado Pago **antes** de ter muitos clubes conectados.
- Sempre que der, usar nos cadastros um **e-mail do projeto** (ex.: `contato@inscricoesfast.com.br`) em vez do Gmail pessoal.
- Manter em dia a lista de onde cada coisa está: este guia e o `docs/CONTINUACAO.md` (seção 3, "Ambientes e endereços").

# Backlog de oportunidades de produto

> Memória do agente `especialista-produto`. Versão inicial: 14/11/2026. Última atualização: 14/11/2026 ([radar](radar/2026-11-14.md)).
> **Situação:** Ideia → Proposta ao Allan → **Aprovada** (vira etapa ou ajuste no `docs/PLANO.md`) → Feita · ou Descartada (com o motivo, para não voltar).
> Só o Allan muda um item para "Aprovada" ou "Descartada".

**Pontuação:** Alcance (1 a 3) × Impacto (1 a 3) × Confiança (50%, 80% ou 100%) ÷ Esforço (P = 1, M = 2, G = 4). Regras completas no agente.
**Objetivos:** 🏃 conversão · 🧰 operação · 🔁 retenção · 📣 aquisição · 💰 receita · 🛡️ confiança.

## Lista (da maior nota para a menor)

| ID | Oportunidade | Objetivo | A | I | C | E | Nota | Situação |
|---|---|---|---|---|---|---|---|---|
| OP-01 | Medir o funil de inscrição | 🏃 base para tudo | 3 | 2 | 100% | P | **6,0** | Ideia |
| OP-02 | Aviso de Pix pendente antes de vencer | 🏃 | 2 | 3 | 80% | P | **4,8** | Ideia |
| OP-03 | E-mail de véspera da prova | 🔁 🧰 | 3 | 2 | 80% | P | **4,8** | Ideia |
| OP-09 | Resultados do simulado e certificado | 🔁 📣 | 3 | 3 | 80% | M | **3,6** | Ideia |
| OP-13 | Aguentar o pico de abertura das inscrições | 🛡️ | 2 | 3 | 50% | P | **3,0** | Ideia |
| OP-08 | Equipes e assessorias | 📣 🧰 | 2 | 3 | 80% | M | **2,4** | Ideia (depende da etapa 6) |
| OP-05 | Lotes de preço por data | 💰 🏃 | 3 | 2 | 80% | M | **2,4** | No plano (Extras) |
| OP-06 | Check-in e retirada de kit com QR | 🧰 | 3 | 2 | 80% | M | **2,4** | No plano (Extras) |
| OP-04 | Card "Eu vou!" para stories e WhatsApp | 📣 | 2 | 2 | 50% | P | **2,0** | Ideia |
| OP-10 | Painel: vendas por dia e aviso aos inscritos | 🧰 | 2 | 2 | 80% | M | **1,6** | Ideia |
| OP-19 | Inscrição de última hora, no local da prova | 🏃 🛡️ | 1 | 2 | 50% | P | **1,0** | Ideia |
| OP-12 | Página do clube com "avise-me quando abrir" | 📣 🔁 | 2 | 2 | 50% | M | **1,0** | No plano (Plataforma aberta) |
| OP-07 | Lista de espera quando esgota | 🏃 | 1 | 2 | 80% | M | **0,8** | Ideia |
| OP-14 | Cartão de crédito e parcelamento | 🏃 | 1 | 2 | 80% | M | **0,8** | No plano (Extras) |
| OP-11 | Formulário em etapas | 🏃 | 3 | 1 | 50% | M | **0,75** | No plano (Extras); esperar dados da OP-01 |
| OP-15 | WhatsApp como canal de aviso | 🔁 | 3 | 2 | 50% | G | **0,75** | Ideia (tem custo mensal) |
| OP-16 | Comprovante na carteira do celular | 🔁 | 2 | 1 | 50% | M | **0,5** | Ideia |
| OP-18 | Seguro atleta | 💰 🛡️ | 2 | 1 | 50% | G | **0,25** | Pendência antiga (depende de seguradora) |
| OP-17 | Ligação com o Strava | 🔁 | 1 | 1 | 50% | G | **0,13** | Radar (só observar) |

## Detalhes

### OP-01 · Medir o funil de inscrição
- **Problema:** não sabemos onde o atleta desiste (na página, no login, no formulário ou no Pix). Hoje não há nenhuma medição de uso no site.
- **Evidência:** nenhum analytics no código (conferido em 14/11/2026); o "formulário em etapas" ficou parado por falta de dados.
- **Menor versão útil:** contar 5 passos por evento (viu a página → começou a inscrição → entrou → gerou o Pix → pagou), sem dado pessoal. Pode ser o Web Analytics da Vercel (ver o limite do plano) ou uma tabela própria de contagem. Mostrar no painel do organizador: "120 visitas · 45 começaram · 30 pagaram".
- **Por que primeiro:** todas as outras decisões ficam melhores com esses números.
- **Validar:** ligar antes do próximo simulado da CF e comparar com o que o Allan percebe.

### OP-02 · Aviso de Pix pendente antes de vencer
- **Problema:** o Pix vence em 30 minutos. Quem se distrai perde a reserva e, às vezes, a inscrição.
- **Evidência:** a tabela `pedidos` já guarda os expirados (dá para medir quantos são); hoje só existem os e-mails de código, confirmação e transferência.
- **Menor versão útil:** um e-mail "Sua vaga está reservada até HH:MM. Pague o Pix", com o botão para a tela do Pix; e, se vencer, "Gere um Pix novo".
- **Atenção:** precisa de algo que rode sozinho (agendamento da Vercel ou envio programado do Resend). Ver o custo e o limite do plano gratuito de e-mails.

### OP-03 · E-mail de véspera da prova
- **Problema:** o atleta pergunta no WhatsApp do clube o horário, o local e o que levar.
- **Menor versão útil:** 1 ou 2 dias antes, um e-mail com o horário da largada, o mapa, a retirada do kit, o número de peito (se houver) e o comprovante. Um texto extra do organizador ("Recado da organização") por evento.
- **Métrica:** menos perguntas repetidas ao organizador (perguntar ao Allan).

### OP-09 · Resultados do simulado e certificado
- **Problema:** num simulado, o mais importante para o atleta é **o tempo dele**. Hoje o resultado circula em planilha ou foto no grupo.
- **Menor versão útil:** o organizador sobe a planilha da cronometragem (número e tempo). O site mostra a classificação geral e por categoria, e cada atleta vê o próprio resultado em Minhas inscrições, com um **certificado compartilhável** (imagem para stories, com a marca do clube).
- **Por que importa:** faz o atleta voltar ao site depois da prova e divulga o clube (ciclo de aquisição). Pode ser o diferencial para outras assessorias.
- **Validar:** perguntar ao Allan como a CF divulga os tempos hoje e o que os alunos pedem.
- **Evidência nova (radar de 14/11/2026):** o mercado aponta a retenção do corredor como o desafio de 2027 (Fato, Máquina do Esporte, out/2026), e a RunSignup lançou a busca por nome ou número nos resultados (Fato, nov/2026). Menor versão útil ajustada: resultados com busca na página do evento e o tempo em "Minhas inscrições"; o certificado em imagem fica para depois.

### OP-13 · Aguentar o pico de abertura das inscrições
- **Problema:** em provas concorridas, todo mundo entra na mesma hora. Concorrentes recebem reclamações de sistema fora do ar justamente nessa hora.
- **Evidência:** Sinal: reclamações no Reclame Aqui (ver `MERCADO.md`). Novas em nov/2026: servidor sobrecarregado na abertura e "vagas indisponíveis" apesar das anunciadas (Minhas Inscrições e Central da Corrida).
- **Menor versão útil:** um teste de carga na homologação antes de abrir um evento grande, e uma página de espera amigável se o banco ficar lento. Ligar com a decisão de hospedagem comercial (etapa de uso real).

### OP-05 · Lotes de preço por data
- Já no plano (Extras). "Virada de lote" cria urgência e é o padrão do mercado. Mostrar "o preço sobe em X dias" na página do evento.

### OP-06 · Check-in e retirada de kit com QR
- Já no plano (Extras). O mercado pede comprovante e documento na retirada; o QR no celular é a recomendação comum.
- **Menor versão útil:** um QR no comprovante e uma tela do painel, no celular do organizador, que lê o QR e marca "kit entregue", com a busca por nome para quem não tem o QR. Inclui a regra do kit de meia (60+) não ser retirado por terceiros.

### OP-04 · Card "Eu vou!" para stories e WhatsApp
- Depois do pagamento, uma imagem pronta ("Eu vou correr o Simuladão da CF · 10K") para postar. Barato e divulga o evento de graça.

### OP-10 · Painel: vendas por dia e aviso aos inscritos
- Um gráfico simples de inscrições por dia, comparando com o evento anterior.
- Um botão "Enviar aviso aos inscritos" (e-mail), por exemplo quando muda o local ou o horário.

### OP-08 · Equipes e assessorias
- **Hipótese estratégica:** a assessoria é a porta de entrada do corredor.
- **Evidência nova (radar de 14/11/2026):** 24% dos corredores participam de assessorias ou grupos (Fato), e a Ticket Sports tem uma área própria para grupos (Fato). Confiança sobe de 50% para 80%; nota de 1,5 para 2,4. Só vale depois da etapa 6 (vários clubes).
- **Menor versão útil:** um campo "equipe" opcional na inscrição, um filtro e um total por equipe no painel e na planilha.
- **Depois:** um link de convite do clube, e a assessoria inscrevendo os alunos em provas de outros clubes da plataforma.

### OP-19 · Inscrição de última hora, no local da prova
- **Problema:** em prova barata, parte das pessoas corre sem se inscrever ("pipoca"). Para o organizador, é risco (sem cadastro numa emergência) e receita perdida.
- **Evidência:** cerca de 36% dos corredores já correram como pipoca, e metade cita o preço (Fato, pesquisa da Ticket Sports, jul/2026). Não sabemos se acontece nos simulados da CF (Hipótese).
- **Menor versão útil:** sem código. Um cartaz com o QR da página do evento na largada e as inscrições abertas até a hora da prova. Se funcionar, uma 2ª versão: o organizador inscreve alguém pelo painel.
- **Validar:** perguntar ao Allan se há pipocas nos simulados e se ele aceita inscrição no dia. Origem: [radar de 14/11/2026](radar/2026-11-14.md).

### OP-12 · Página do clube com "avise-me quando abrir"
- Já no plano (Plataforma aberta), com a página do clube. Somar um "Me avise quando abrir a próxima prova" (e-mail), que cria uma lista de interessados para o clube.

### OP-07 · Lista de espera quando esgota
- Quando acabarem as vagas, o atleta entra na fila; se um Pix vencer ou uma inscrição for cancelada, o próximo recebe um aviso com prazo para pagar. É padrão nas plataformas de fora, mas só faz sentido nos eventos que esgotam.

### OP-14 · Cartão de crédito e parcelamento
- Já no plano (Extras). Nos simulados, que são baratos, o Pix resolve; o cartão pesa mais em provas caras ou em pacotes.
- **Nov/2026:** as regras do Pix Parcelado no Banco Central seguem indefinidas (fontes se contradizem). Esperar antes de decidir entre cartão e Pix Parcelado.

### OP-11 · Formulário em etapas
- Ficou de fora da etapa 4. Decidir com os números da OP-01: se a desistência estiver no formulário, ele sobe na lista.

### OP-15 · WhatsApp como canal de aviso
- O brasileiro lê mais o WhatsApp que o e-mail. A API oficial tem **custo por mensagem** e exige uma conta de empresa. Avaliar depois de medir a abertura dos e-mails.

### OP-16 · Comprovante na carteira do celular
- Apple Wallet e Google Wallet, com o QR da OP-06. Conforto, não urgente.

### OP-18 · Seguro atleta
- Pendência antiga (o site anterior oferecia). Depende de uma seguradora parceira e, provavelmente, de CNPJ.

### OP-17 · Ligação com o Strava
- Por exemplo, ligar a atividade do dia ao resultado, ou criar desafios do clube. Só observar por enquanto.

## Só observar (radar)

- **Inscrição feita por assistentes de IA do atleta:** a RunSignup diz estar pronta para isso (set/2026). Longe da nossa realidade; rever em 2027.
- **Nome impróprio no número de peito:** reclamação na Minhas Inscrições (nov/2026). Lembrar quando houver número de peito com nome.

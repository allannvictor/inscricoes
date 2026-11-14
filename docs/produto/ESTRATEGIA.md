# Estratégia de produto

> Memória do agente `especialista-produto` (`.claude/agents/especialista-produto.md`). Versão inicial: 14/11/2026.
> Este arquivo **propõe**: o que vale é o que o Allan aprovar e for para o `docs/PLANO.md`.

## Tese (hipótese a validar)

O Inscrições Fast é **a ferramenta de inscrição do clube e da assessoria**, não um "shopping de provas".
- **Por quê:** a corrida de rua cresce no Brasil, e o que segura o corredor é cada vez mais a **comunidade** (o grupo, a assessoria), não o produto. As plataformas grandes são vitrines de muitas provas e cobram caro. Um clube pequeno quer um link próprio, simples, com Pix, e ver o dinheiro cair na conta dele.
- **Nosso diferencial hoje:** inscrição em poucos toques no celular, vários participantes no mesmo Pix, preço de aluno e meia automáticos, transferência pelo próprio atleta, dinheiro direto na conta do clube e a cara do clube (cor, foto, nome do preço especial).

## Públicos

Atleta · comprador do grupo · organizador/assessoria · master (plataforma) · novo clube. Detalhes no agente.

## Métrica principal (North Star) proposta

**Inscrições pagas por mês**, somando todos os clubes.

Métricas de apoio:

| Métrica | O que mostra | Hoje |
|---|---|---|
| Conversão: viu o evento → Pix pago | Se a página e o formulário convencem e são fáceis | ❌ não medimos |
| Pix gerado → Pix pago | Quem desiste na hora de pagar | 🟡 dá para calcular pelo banco (pedidos pagos e expirados) |
| Tempo da inscrição | Atrito do formulário | ❌ não medimos |
| Atletas que voltam (2ª prova) | Retenção | 🟡 dá para calcular pelo banco |
| Clubes com evento publicado no mês | Crescimento da plataforma | 🟡 dá para calcular pelo banco |
| Pedidos de ajuda ao organizador por prova | Operação | ❌ só com o Allan |

**Lacuna principal:** o site não tem nenhuma medição de uso (nem analytics). Sem isso, toda priorização é opinião. Ver a OP-01 no `BACKLOG.md`.

## Princípios de produto

1. **Celular e 4G primeiro.** O computador é bem-vindo, mas o atleta está no celular.
2. **Menos campos, menos passos.** Pedir um dado só quando ele é usado.
3. **O clube aparece, a plataforma some.** A marca é do clube; a nossa aparece pouco.
4. **Confiança no dinheiro.** Pix claro, comprovante fácil, o organizador vê o que entrou.
5. **Custo perto de zero.** Ideias com custo mensal precisam pagar a conta.
6. **Validar com a CF primeiro.** A CF e os simulados são o laboratório.

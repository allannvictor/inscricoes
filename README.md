# Inscrições

Site de inscrições para simulados de clubes de corrida: página do evento, login por código no e-mail,
vários participantes por pedido, preço de sócio por CPF, pagamento Pix (Mercado Pago) e painel do organizador.

Estado atual: **protótipo** (`docs/prototipo.html`, abre direto no navegador, dados fictícios).

## Plano por etapas

| Etapa | Entrega |
|---|---|
| 0. Protótipo | Telas clicáveis para validar fluxo e campos |
| 1. Inscrição com Pix | Página do evento, login por código, vários participantes, preço de sócio, Pix com confirmação automática, e-mail |
| 2. Painel básico | Criar/editar evento, inscritos, exportar planilha, importar sócios |
| 3. Área do atleta | Minhas inscrições, comprovante, transferência, meus dados |
| 4. Uso real | Simulado do clube e ajustes |
| 5. Extras | Cupons, cartão, check-in, lotes de preço |
| 6. Outros clubes | Cada clube conecta o próprio Mercado Pago (split), comissão, domínio |

## Decisões tomadas

- Dinheiro cai direto na conta Mercado Pago do clube (modelo split); a plataforma não segura valores.
- Pix primeiro; cartão preparado para depois.
- Atleta entra com e-mail + código de 6 dígitos (sem senha); conta criada na primeira inscrição.
- Sem reembolso; o atleta pode transferir a inscrição até a data definida pelo organizador.
- Preço de sócio pela lista de CPFs do clube; cupons como opção extra.
- Hospedagem: Vercel (endereço gratuito no início), banco Postgres no Neon, e-mails via Resend.
- Visual neutro: sempre fundo branco (sem modo escuro), uma cor de destaque; o limite de vagas não aparece para o atleta.
- Primeiro clube: CF Assessoria Esportiva.
- Cada evento tem imagem de capa (16:9, também usada na prévia do link no WhatsApp); o clube tem foto/logo no perfil, exibida na página dos eventos.

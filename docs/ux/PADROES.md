# Padrões de UX e visual do Inscrições Fast

> Última atualização: 14/11/2026 (criação, a partir de `src/app/globals.css` no `staging`).
> Mantido pelo agente `especialista-ux`. Quando o visual mudar no código, este arquivo acompanha.

## Princípios

1. **Celular primeiro.** O atleta usa Android no 4G. Tudo é desenhado para 360 a 440 px e depois ampliado.
2. **Uma ação principal por tela.** Um botão primário (`.botao-primario`), o resto em borda ou link.
3. **Certeza na hora do dinheiro.** Preço, prazo do Pix e situação do pedido sempre visíveis e sem ambiguidade.
4. **A cara é do clube.** A cor de destaque e a foto são do clube; a plataforma fica discreta.
5. **Acessível por padrão.** WCAG 2.2 AA: contraste, rótulos, foco visível, toque de 44 px, nada só pela cor.
6. **Texto simples.** Português do dia a dia, verbos de ação, erro que diz o que fazer.

## Tokens (bloco `@theme` em `src/app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `--color-tinta` | `#1b1f24` | Texto principal |
| `--color-suave` | `#5f6670` | Texto secundário, dicas, rótulos |
| `--color-linha` | `#e2e5e9` | Bordas |
| `--color-fundo2` | `#f5f6f8` | Fundo de blocos internos, cabeçalho de tabela |
| `--color-fundo-pagina` | `#f3f5f8` | Fundo da página |
| `--color-acao` / `-texto` / `-tinta` | `#2563eb` / branco / `#2563eb` | Cor do clube: botão, texto do botão, links. Trocadas por clube (`src/lib/regras/cores.ts`) |
| `--color-ok` / `-fundo` | `#157a46` / `#e3f4ea` | Sucesso, pago |
| `--color-alerta` / `-fundo` | `#9a5b00` / `#fff1d6` | Aguardando, atenção |
| `--color-erro` / `-fundo` | `#b42318` / `#fde8e6` | Erro, cancelado |
| `--font-display` | Barlow Condensed | Títulos e números grandes |
| `--font-sans` | Public Sans | Texto |

Texto base: 15 px. Campos: 16 px (evita o zoom automático do iPhone). Raio: 12 px em cartões, 9 a 10 px em campos e botões.

## Componentes (classes em `globals.css`)

| Classe | O que é |
|---|---|
| `.pagina` | Coluna do atleta (até 440 px) |
| `.painel` | Área do organizador (até 1280 px) |
| `.cartao` | Bloco branco com borda |
| `.titulo-1`, `.titulo-2`, `.titulo-3`, `.rotulo` | Hierarquia de texto |
| `.botao` + `-primario`, `-borda`, `-pequeno` | Botões |
| `.link` | Link com a cor do clube |
| `.campo`, `.entrada`, `.dica`, `.erros` | Formulários |
| `.selo` + `-ok`, `-alerta`, `-erro`, `-neutro` | Situação (sempre com texto) |
| `.chip` | Escolha de distância ou opção (`aria-pressed`) |
| `.abas` | Abas com `aria-current="page"` |
| `.tabela-wrap`, `.tabela` | Tabelas do painel com rolagem própria |
| `.fixo-baixo` | Botão principal preso embaixo no celular |
| `.capa`, `.avatar`, `.numero-peito`, `.barra`, `.numero-grande` | Imagem 16:9, foto do clube, número de peito, progresso, indicador |

Ícones: `src/components/Icones.tsx`.

## Pontos de atenção conhecidos

- Ainda não houve varredura. A primeira vai preencher esta seção.

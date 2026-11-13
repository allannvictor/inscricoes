'use client';

export function BotaoImprimir() {
  return (
    <button type="button" className="botao botao-borda w-full print:hidden" onClick={() => window.print()}>
      Imprimir ou salvar em PDF
    </button>
  );
}

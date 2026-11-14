import { estiloDoTema, temaDoClube } from '@/lib/regras/cores';

/** Aplica a cor de destaque do clube (botões, ícones, links) ao trecho da página dentro dele. */
export function TemaClube({ cor, className, children }: { cor: string | null | undefined; className?: string; children: React.ReactNode }) {
  return (
    <div className={className} style={estiloDoTema(temaDoClube(cor)) as React.CSSProperties}>
      {children}
    </div>
  );
}

/** Ícones de traço (decorativos: sempre acompanhados de texto). A cor vem de `currentColor`. */

type P = { className?: string };
const base = (className?: string) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  className: `flex-none ${className ?? ''}`,
});

export const IconeCalendario = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
);
export const IconeRelogio = ({ className }: P) => (
  <svg {...base(className)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const IconeLocal = ({ className }: P) => (
  <svg {...base(className)}><path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>
);
export const IconeCadeado = ({ className }: P) => (
  <svg {...base(className)}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>
);
export const IconeAgenda = ({ className }: P) => (
  <svg {...base(className)}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" /></svg>
);
export const IconeCompartilhar = ({ className }: P) => (
  <svg {...base(className)}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></svg>
);
export const IconeSeta = ({ className }: P) => (
  <svg {...base(className)}><path d="M9 6l6 6-6 6" /></svg>
);
export const IconeDocumento = ({ className }: P) => (
  <svg {...base(className)}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
);
export const IconeTroca = ({ className }: P) => (
  <svg {...base(className)}><path d="M7 7h12l-3-3M17 17H5l3 3" /></svg>
);

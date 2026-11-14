/* eslint-disable @next/next/no-img-element */
export function Capa({ src, alt }: { src: string | null; alt: string }) {
  return (
    <div className="capa">
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <svg viewBox="0 0 160 90" role="img" aria-label="Imagem do evento">
          <rect width="160" height="90" fill="#dde5ef" />
          <circle cx="124" cy="26" r="9" fill="#f5f6f8" />
          <path d="M0 60 Q40 48 80 56 T160 50 V90 H0Z" fill="#bccadb" />
          <path d="M71 90 L78.5 56 L81.5 56 L89 90Z" fill="#8e9db1" />
          <path d="M80 60v3M80 68v5M80 79v7" stroke="#ffffff" strokeWidth="1" />
        </svg>
      )}
    </div>
  );
}

export function Avatar({ src, nome, pequeno }: { src: string | null; nome: string; pequeno?: boolean }) {
  const palavras = nome.split(/\s+/).filter(Boolean);
  // Siglas curtas (ex.: "CF Assessoria") viram as iniciais; senão, primeira letra das duas primeiras palavras.
  const iniciais = palavras[0] && palavras[0].length <= 3 && palavras[0] === palavras[0].toUpperCase() ? palavras[0] : palavras.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('');
  return <div className={pequeno ? 'avatar h-8 w-8 text-xs' : 'avatar'}>{src ? <img src={src} alt={`Foto de ${nome}`} /> : iniciais}</div>;
}

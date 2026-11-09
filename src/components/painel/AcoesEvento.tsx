'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { alterarStatusEventoAcao, duplicarEventoAcao } from '@/app/painel/acoes';

const TEXTOS: Record<string, { selo: string; classe: string }> = {
  rascunho: { selo: 'Rascunho', classe: 'selo-neutro' },
  publicado: { selo: 'Publicado', classe: 'selo-ok' },
  encerrado: { selo: 'Encerrado', classe: 'selo-alerta' },
};

export function SeloStatus({ status }: { status: string }) {
  const t = TEXTOS[status] ?? TEXTOS.rascunho;
  return <span className={`selo ${t.classe}`}>{t.selo}</span>;
}

/** Publicar / despublicar / encerrar, com confirmação na própria tela. */
export function BotoesStatus({ eventoId, status }: { eventoId: string; status: string }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const mudar = (novo: string) =>
    iniciar(async () => {
      const r = await alterarStatusEventoAcao(eventoId, novo);
      if (!r.ok) setErro(r.erros.join(' '));
      setConfirmar(null);
      router.refresh();
    });

  const perguntas: Record<string, string> = {
    publicado: 'Publicar? O link passa a aceitar inscrições.',
    rascunho: 'Voltar para rascunho? O link deixa de aceitar inscrições (as existentes continuam).',
    encerrado: 'Encerrar? Ninguém mais se inscreve; os inscritos continuam na lista.',
  };

  if (confirmar) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm">{perguntas[confirmar]}</span>
        <button className="botao botao-primario botao-pequeno" disabled={ocupado} onClick={() => mudar(confirmar)}>Confirmar</button>
        <button className="botao botao-borda botao-pequeno" disabled={ocupado} onClick={() => setConfirmar(null)}>Voltar</button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== 'publicado' && <button className="botao botao-primario botao-pequeno" onClick={() => setConfirmar('publicado')}>Publicar</button>}
      {status === 'publicado' && <button className="botao botao-borda botao-pequeno" onClick={() => setConfirmar('rascunho')}>Despublicar</button>}
      {status !== 'encerrado' && <button className="botao botao-borda botao-pequeno" onClick={() => setConfirmar('encerrado')}>Encerrar</button>}
      {erro && <span className="text-sm text-erro">{erro}</span>}
    </div>
  );
}

export function BotaoDuplicar({ eventoId, clubeSlug }: { eventoId: string; clubeSlug: string }) {
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();
  return (
    <button
      className="botao botao-borda botao-pequeno"
      disabled={ocupado}
      onClick={() =>
        iniciar(async () => {
          const r = await duplicarEventoAcao(eventoId);
          if (r.ok) router.push(`/painel/c/${clubeSlug}/eventos/${r.eventoId}/editar`);
        })
      }
    >
      {ocupado ? 'Duplicando…' : 'Duplicar'}
    </button>
  );
}

export function CopiarLink({ caminho }: { caminho: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <button
      className="botao botao-borda botao-pequeno"
      onClick={async () => {
        const url = window.location.origin + caminho;
        try {
          await navigator.clipboard.writeText(url);
          setCopiado(true);
          setTimeout(() => setCopiado(false), 2000);
        } catch {
          window.prompt('Copie o link:', url);
        }
      }}
    >
      {copiado ? 'Link copiado!' : 'Copiar link'}
    </button>
  );
}

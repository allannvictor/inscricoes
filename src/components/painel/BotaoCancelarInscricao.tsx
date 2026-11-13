'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { cancelarInscricaoAcao } from '@/app/painel/acoes';

export function BotaoCancelarInscricao({ inscricaoId, nome }: { inscricaoId: string; nome: string }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  if (!confirmar) {
    return (
      <button className="botao botao-borda botao-pequeno" onClick={() => setConfirmar(true)} aria-label={`Cancelar inscrição de ${nome}`}>
        Cancelar
      </button>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <button
        className="botao botao-pequeno border-erro bg-white text-erro"
        disabled={ocupado}
        onClick={() =>
          iniciar(async () => {
            const r = await cancelarInscricaoAcao(inscricaoId);
            if (!r.ok) setErro(r.erros.join(' '));
            setConfirmar(false);
            router.refresh();
          })
        }
      >
        {ocupado ? 'Cancelando…' : 'Confirmar'}
      </button>
      <button className="botao botao-borda botao-pequeno" disabled={ocupado} onClick={() => setConfirmar(false)}>Voltar</button>
      {erro && <span className="text-xs text-erro">{erro}</span>}
    </span>
  );
}

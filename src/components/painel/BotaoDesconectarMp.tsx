'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { desconectarMercadoPagoAcao } from '@/app/painel/acoes';

export function BotaoDesconectarMp({ clubeId }: { clubeId: string }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, iniciar] = useTransition();
  if (!confirmar) {
    return <button className="botao botao-borda botao-pequeno" onClick={() => setConfirmar(true)}>Desconectar</button>;
  }
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="text-sm">Os eventos publicados deixam de receber Pix até conectar de novo.</span>
      <button
        className="botao botao-pequeno border-erro bg-white text-erro"
        disabled={ocupado}
        onClick={() =>
          iniciar(async () => {
            await desconectarMercadoPagoAcao(clubeId);
            setConfirmar(false);
            router.refresh();
          })
        }
      >
        {ocupado ? 'Desconectando…' : 'Confirmar'}
      </button>
      <button className="botao botao-borda botao-pequeno" disabled={ocupado} onClick={() => setConfirmar(false)}>Voltar</button>
    </span>
  );
}

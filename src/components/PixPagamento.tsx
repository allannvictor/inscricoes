'use client';

/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

/** QR code + copia e cola, contagem regressiva e consulta do status a cada 5 segundos. */
export function PixPagamento(props: { pedidoId: string; copiaECola: string; qrBase64: string; expiraEm: string; simulado: boolean }) {
  const router = useRouter();
  const [restante, setRestante] = useState(() => Math.max(0, new Date(props.expiraEm).getTime() - Date.now()));
  const [copiado, setCopiado] = useState(false);
  const [simulando, setSimulando] = useState(false);

  useEffect(() => {
    const relogio = setInterval(() => setRestante(Math.max(0, new Date(props.expiraEm).getTime() - Date.now())), 1000);
    const consulta = setInterval(async () => {
      const r = await fetch(`/api/pedidos/${props.pedidoId}/status`, { cache: 'no-store' }).catch(() => null);
      const dados = r?.ok ? await r.json() : null;
      if (dados && dados.status !== 'pendente') router.refresh();
    }, 5000);
    return () => {
      clearInterval(relogio);
      clearInterval(consulta);
    };
  }, [props.expiraEm, props.pedidoId, router]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(props.copiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      (document.getElementById('pix-codigo') as HTMLInputElement | null)?.select();
    }
  };

  const simular = async () => {
    setSimulando(true);
    await fetch(`/api/pedidos/${props.pedidoId}/simular`, { method: 'POST' });
    router.refresh();
  };

  const min = Math.floor(restante / 60000);
  const seg = Math.floor((restante % 60000) / 1000);

  // Computador: QR grande à esquerda (para escanear a tela com o celular) e instruções à direita.
  return (
    <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:items-center lg:gap-6">
      <div className="mx-auto h-[220px] w-[220px] rounded-xl border border-linha bg-white p-2.5 lg:h-[300px] lg:w-[300px]">
        {props.qrBase64 ? <img src={`data:image/png;base64,${props.qrBase64}`} alt="QR code do Pix" className="h-full w-full" /> : null}
      </div>
      <div className="flex flex-col gap-3">
      <ol className="hidden list-decimal flex-col gap-1 pl-5 text-sm lg:flex">
        <li>Abra o app do seu banco no celular e escolha <b>Pix</b>.</li>
        <li>Escolha <b>Pagar com QR code</b> e aponte a câmera para o código ao lado.</li>
        <li>Confira o valor e confirme. Esta tela atualiza sozinha.</li>
      </ol>
      <p className="text-center text-sm text-suave lg:text-left">Abra o app do banco e escaneie, ou copie o código:</p>
      <div className="flex gap-2">
        <input id="pix-codigo" className="entrada min-w-0 flex-1 font-mono text-xs" readOnly value={props.copiaECola} onFocus={(e) => e.target.select()} />
        <button type="button" className="botao botao-borda botao-pequeno" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar'}</button>
      </div>
      <div className="flex items-center justify-center gap-2.5 font-semibold lg:justify-start" aria-live="polite">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-alerta motion-reduce:animate-none" aria-hidden />
        {restante > 0 ? (
          <>Aguardando pagamento · <span className="num">{String(min).padStart(2, '0')}:{String(seg).padStart(2, '0')}</span></>
        ) : (
          'Tempo esgotado'
        )}
      </div>
      <p className="text-center text-sm text-suave lg:text-left">Esta tela atualiza sozinha quando o Pix cair. Pode fechar: o link deste pedido fica no seu e-mail.</p>
      {props.simulado && (
        <button type="button" className="botao botao-borda w-full border-dashed" disabled={simulando} onClick={simular}>
          {simulando ? 'Confirmando…' : 'Modo teste: simular Pix recebido'}
        </button>
      )}
      </div>
    </div>
  );
}

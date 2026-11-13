'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { importarSociosAcao, removerSocioAcao } from '@/app/painel/acoes';

export function ImportarSocios({ clubeId, total }: { clubeId: string; total: number }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [substituir, setSubstituir] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string; invalidas?: string[] } | null>(null);
  const [ocupado, iniciar] = useTransition();
  return (
    <form
      className="cartao"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await importarSociosAcao(clubeId, texto, substituir);
          if (!r.ok) return setMsg({ ok: false, texto: r.erros.join(' ') });
          setMsg({ ok: true, texto: `${r.importados} sócio(s) ${substituir ? 'na nova lista' : 'importado(s) ou atualizado(s)'}.`, invalidas: r.invalidas });
          setTexto('');
          router.refresh();
        });
      }}
    >
      <h3 className="titulo-3">Importar da planilha</h3>
      <p className="text-sm text-suave">Copie as colunas CPF e Nome da sua planilha e cole aqui (uma pessoa por linha). Também funciona com só o CPF.</p>
      <div className="campo">
        <label htmlFor="socios-texto">Lista</label>
        <textarea id="socios-texto" className="entrada num h-auto min-h-36 py-2.5" rows={6} placeholder={'529.982.247-25;Marina Costa\n111.444.777-35;Rafael Lima'} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" className="mt-1 h-[18px] w-[18px] accent-acao" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} />
        <span><b>Substituir a lista atual</b> ({total} sócios). Use quando a planilha for a lista completa e atualizada, por exemplo só quem está com a mensalidade em dia. Desmarcado: só adiciona e atualiza.</span>
      </label>
      {msg && (
        <div className={msg.ok ? 'rounded-xl bg-ok-fundo p-3 text-sm text-ok' : 'erros'} role="status">
          {msg.texto}
          {msg.invalidas && msg.invalidas.length > 0 && (
            <>
              <br />
              <b className="text-erro">Linhas ignoradas (CPF inválido):</b>
              <ul className="list-disc pl-5 text-erro">{msg.invalidas.slice(0, 20).map((l) => <li key={l}>{l}</li>)}</ul>
            </>
          )}
        </div>
      )}
      <button className="botao botao-primario botao-pequeno self-start" disabled={ocupado || !texto.trim()}>{ocupado ? 'Importando…' : 'Importar'}</button>
    </form>
  );
}

export function BotaoRemoverSocio({ clubeId, cpf }: { clubeId: string; cpf: string }) {
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();
  return (
    <button className="botao botao-borda botao-pequeno" disabled={ocupado} onClick={() => iniciar(async () => { await removerSocioAcao(clubeId, cpf); router.refresh(); })}>
      Remover
    </button>
  );
}

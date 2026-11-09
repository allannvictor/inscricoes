'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { alternarCupomAcao, criarCupomAcao } from '@/app/painel/acoes';

export function FormularioCupom({ eventoId }: { eventoId: string }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [tipo, setTipo] = useState<'percentual' | 'valor'>('percentual');
  const [valor, setValor] = useState('');
  const [limite, setLimite] = useState('');
  const [erros, setErros] = useState<string[]>([]);
  const [ocupado, iniciar] = useTransition();
  return (
    <form
      className="cartao"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await criarCupomAcao(eventoId, { codigo, tipo, valor, limite });
          if (!r.ok) return setErros(r.erros);
          setErros([]);
          setCodigo('');
          setValor('');
          setLimite('');
          router.refresh();
        });
      }}
    >
      <h3 className="titulo-3">Novo cupom</h3>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="campo">
          <label htmlFor="cp-codigo">Código</label>
          <input id="cp-codigo" className="entrada uppercase" placeholder="CONVIDADO" value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />
        </div>
        <div className="campo">
          <label htmlFor="cp-tipo">Tipo</label>
          <select id="cp-tipo" className="entrada" value={tipo} onChange={(e) => setTipo(e.target.value as 'percentual' | 'valor')}>
            <option value="percentual">% de desconto</option>
            <option value="valor">R$ de desconto</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="cp-valor">{tipo === 'percentual' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
          <input id="cp-valor" className="entrada num" inputMode="decimal" placeholder={tipo === 'percentual' ? '10' : '10,00'} value={valor} onChange={(e) => setValor(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="cp-limite">Limite de usos</label>
          <input id="cp-limite" className="entrada num" inputMode="numeric" placeholder="Sem limite" value={limite} onChange={(e) => setLimite(e.target.value)} />
        </div>
      </div>
      {erros.length > 0 && <p className="erros" role="alert">{erros.join(' ')}</p>}
      <button className="botao botao-primario botao-pequeno self-start" disabled={ocupado}>{ocupado ? 'Criando…' : 'Criar cupom'}</button>
      <span className="dica">O cupom vale só para quem paga preço cheio (não acumula com preço de sócio nem com a meia 60+). Cada pedido conta como um uso.</span>
    </form>
  );
}

export function BotaoAlternarCupom({ cupomId, ativo }: { cupomId: string; ativo: boolean }) {
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();
  return (
    <button className="botao botao-borda botao-pequeno" disabled={ocupado} onClick={() => iniciar(async () => { await alternarCupomAcao(cupomId); router.refresh(); })}>
      {ativo ? 'Desativar' : 'Ativar'}
    </button>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { salvarEventoAcao } from '@/app/painel/acoes';
import type { EventoForm } from '@/lib/painel/evento-form';

type Distancia = EventoForm['distancias'][number];

const novaDistancia = (): Distancia => ({ nome: '', preco: '', precoSocio: '', vagas: '' });

function meia(preco: string): string {
  const n = Number(preco.replace(/\s|R\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? 'R$ ' + (Math.floor(n * 50) / 100).toFixed(2).replace('.', ',') : '—';
}

export function FormularioEvento(props: { clubeId: string; clubeSlug: string; eventoId: string | null; inicial: EventoForm; temInscritos?: boolean }) {
  const router = useRouter();
  const [f, setF] = useState<EventoForm>(props.inicial);
  const [erros, setErros] = useState<string[]>([]);
  const [salvo, setSalvo] = useState(false);
  const [ocupado, iniciar] = useTransition();

  const campo = <K extends keyof EventoForm>(k: K, v: EventoForm[K]) => {
    setSalvo(false);
    setF((x) => ({ ...x, [k]: v }));
  };
  const dist = (i: number, k: keyof Distancia, v: string) => {
    setSalvo(false);
    setF((x) => ({ ...x, distancias: x.distancias.map((d, j) => (j === i ? { ...d, [k]: v } : d)) }));
  };

  const salvar = () =>
    iniciar(async () => {
      setErros([]);
      const r = await salvarEventoAcao(props.clubeId, props.eventoId, f);
      if (!r.ok) {
        setErros(r.erros);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      if (!props.eventoId) router.push(`/painel/c/${props.clubeSlug}/eventos/${r.eventoId}/editar?criado=1`);
      else {
        setSalvo(true);
        router.refresh();
      }
    });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        salvar();
      }}
    >
      {erros.length > 0 && (
        <div className="erros" role="alert">
          <b>Confira:</b>
          <ul className="mt-1 list-disc pl-5">{erros.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <section className="cartao">
        <h2 className="titulo-3">Informações</h2>
        <div className="campo">
          <label htmlFor="ev-nome">Nome do evento</label>
          <input id="ev-nome" className="entrada" placeholder="Ex.: Simulado 10K de Janeiro" value={f.nome} onChange={(e) => campo('nome', e.target.value)} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="campo">
            <label htmlFor="ev-data">Data e hora da largada</label>
            <input id="ev-data" className="entrada" type="datetime-local" value={f.dataHora} onChange={(e) => campo('dataHora', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="ev-local">Local</label>
            <input id="ev-local" className="entrada" value={f.local} onChange={(e) => campo('local', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="ev-fim">Inscrições até (dia, inclusive)</label>
            <input id="ev-fim" className="entrada" type="date" value={f.inscricoesAte} onChange={(e) => campo('inscricoesAte', e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="ev-transf">Transferência até <span className="font-normal text-suave">(opcional)</span></label>
            <input id="ev-transf" className="entrada" type="date" value={f.transferenciaAte ?? ''} onChange={(e) => campo('transferenciaAte', e.target.value)} />
            <span className="dica">Até esse dia o atleta pode passar a inscrição para outra pessoa.</span>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="ev-desc">Informações para o atleta (kit, percurso, horários)</label>
          <textarea id="ev-desc" className="entrada h-auto min-h-28 py-2.5" rows={5} value={f.descricao ?? ''} onChange={(e) => campo('descricao', e.target.value)} />
        </div>
      </section>

      <section className="cartao">
        <h2 className="titulo-3">Distâncias e preços</h2>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-1 h-[18px] w-[18px] accent-acao" checked={f.precoSocioAtivo} onChange={(e) => campo('precoSocioAtivo', e.target.checked)} />
          <span>
            <b>Preço diferenciado para sócio</b>
            <br />
            <span className="text-sm text-suave">Desligado: todos pagam o mesmo preço. Os sócios são cadastrados na aba Sócios.</span>
          </span>
        </label>
        <p className="text-sm text-suave">Quem tem 60 anos ou mais paga meia automaticamente (Estatuto da Pessoa Idosa). Os descontos não acumulam.</p>

        <div className="flex flex-col gap-3">
          {f.distancias.map((d, i) => (
            <div key={i} className="grid items-start gap-2 rounded-xl border border-linha p-3 md:grid-cols-[1.3fr_1fr_1fr_1fr_auto] md:border-0 md:p-0">
              <div className="campo">
                <label htmlFor={`d-nome-${i}`}>Distância</label>
                <input id={`d-nome-${i}`} className="entrada" placeholder="Ex.: 10 km" value={d.nome} onChange={(e) => dist(i, 'nome', e.target.value)} />
              </div>
              <div className="campo">
                <label htmlFor={`d-preco-${i}`}>Preço (R$)</label>
                <input id={`d-preco-${i}`} className="entrada num" inputMode="decimal" placeholder="60,00" value={d.preco} onChange={(e) => dist(i, 'preco', e.target.value)} />
                <span className="dica num">60+: {meia(d.preco)}</span>
              </div>
              {f.precoSocioAtivo ? (
                <div className="campo">
                  <label htmlFor={`d-socio-${i}`}>Preço sócio (R$)</label>
                  <input id={`d-socio-${i}`} className="entrada num" inputMode="decimal" placeholder="45,00" value={d.precoSocio} onChange={(e) => dist(i, 'precoSocio', e.target.value)} />
                </div>
              ) : (
                <div className="hidden md:block" />
              )}
              <div className="campo">
                <label htmlFor={`d-vagas-${i}`}>Limite de vagas</label>
                <input id={`d-vagas-${i}`} className="entrada num" inputMode="numeric" placeholder="Sem limite" value={d.vagas} onChange={(e) => dist(i, 'vagas', e.target.value)} />
              </div>
              <button
                type="button"
                className="botao botao-borda botao-pequeno md:mt-[26px]"
                disabled={f.distancias.length === 1}
                onClick={() => setF((x) => ({ ...x, distancias: x.distancias.filter((_, j) => j !== i) }))}
                aria-label={`Remover distância ${d.nome || i + 1}`}
              >
                Remover
              </button>
            </div>
          ))}
        </div>
        {props.temInscritos && <p className="dica">Distâncias que já têm inscrições não podem ser removidas. Para parar de vender uma delas, ajuste o limite de vagas.</p>}
        <button type="button" className="botao botao-borda botao-pequeno self-start" onClick={() => setF((x) => ({ ...x, distancias: [...x.distancias, novaDistancia()] }))}>
          + Adicionar distância
        </button>
      </section>

      <section className="cartao">
        <h2 className="titulo-3">O que pedir no formulário</h2>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-1 h-[18px] w-[18px] accent-acao" checked={f.pedeCamisa} onChange={(e) => campo('pedeCamisa', e.target.checked)} />
          <span><b>Tamanho de camisa</b><br /><span className="text-sm text-suave">PP, P, M, G, GG, XG</span></span>
        </label>
        <label className="flex items-start gap-2.5">
          <input type="checkbox" className="mt-1 h-[18px] w-[18px] accent-acao" checked={f.usaCategoria} onChange={(e) => campo('usaCategoria', e.target.checked)} />
          <span><b>Categoria por idade e sexo</b><br /><span className="text-sm text-suave">Calculada pelo nascimento e pelo sexo: até 17, 18–29, 30–39, 40–49, 50–59, 60+ (idade no dia da prova). Com categoria, o formulário pede o sexo.</span></span>
        </label>
        <p className="text-sm text-suave">Nome, CPF, nascimento, WhatsApp e contato de emergência são sempre pedidos. O sexo só é pedido em evento com categoria.</p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button className="botao botao-primario" disabled={ocupado}>{ocupado ? 'Salvando…' : props.eventoId ? 'Salvar alterações' : 'Criar evento (rascunho)'}</button>
        {salvo && <span className="selo selo-ok">Alterações salvas</span>}
      </div>
    </form>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { salvarMeusDadosAcao } from '@/app/inscricoes/acoes';
import { TAMANHOS_CAMISA, mascaraTelefone } from '@/lib/mascaras';
import { formatarCpf } from '@/lib/regras/cpf';

type Dados = { nome: string; cpf: string; nascimento: string; sexo: '' | 'F' | 'M'; telefone: string; camisa: string; contatoEmergencia: string };

export function FormularioMeusDados({ inicial, hoje }: { inicial: Dados; hoje: string }) {
  const [f, setF] = useState<Dados>({ ...inicial, cpf: inicial.cpf ? formatarCpf(inicial.cpf) : '' });
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const campo = (k: keyof Dados, v: string) => {
    setMsg(null);
    setF((x) => ({ ...x, [k]: v }));
  };
  return (
    <form
      className="cartao"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvarMeusDadosAcao(f);
          setMsg(r.ok ? { ok: true, texto: 'Dados salvos. Eles vêm preenchidos na sua próxima inscrição.' } : { ok: false, texto: r.erros.join(' ') });
        });
      }}
    >
      <div className="campo"><label htmlFor="md-nome">Nome completo</label><input id="md-nome" className="entrada" autoComplete="name" value={f.nome} onChange={(e) => campo('nome', e.target.value)} /></div>
      <div className="campo">
        <label htmlFor="md-cpf">CPF</label>
        <input id="md-cpf" className="entrada num" inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={(e) => campo('cpf', formatarCpf(e.target.value))} />
        <span className="dica">Com o CPF, você também vê as inscrições que outras pessoas fizeram para você.</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="campo"><label htmlFor="md-nasc">Nascimento</label><input id="md-nasc" className="entrada" type="date" max={hoje} value={f.nascimento} onChange={(e) => campo('nascimento', e.target.value)} /></div>
        <div className="campo">
          <label htmlFor="md-sexo">Sexo</label>
          <select id="md-sexo" className="entrada" value={f.sexo} onChange={(e) => campo('sexo', e.target.value)}>
            <option value="">Selecione</option><option value="F">Feminino</option><option value="M">Masculino</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="campo"><label htmlFor="md-tel">WhatsApp</label><input id="md-tel" className="entrada" inputMode="tel" autoComplete="tel" value={f.telefone} onChange={(e) => campo('telefone', mascaraTelefone(e.target.value))} /></div>
        <div className="campo">
          <label htmlFor="md-camisa">Camisa</label>
          <select id="md-camisa" className="entrada" value={f.camisa} onChange={(e) => campo('camisa', e.target.value)}>
            <option value="">Tamanho</option>{TAMANHOS_CAMISA.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="campo"><label htmlFor="md-emerg">Contato de emergência</label><input id="md-emerg" className="entrada" placeholder="Nome e telefone" value={f.contatoEmergencia} onChange={(e) => campo('contatoEmergencia', e.target.value)} /></div>
      {msg && <p className={msg.ok ? 'text-sm text-ok' : 'erros'} role="status">{msg.texto}</p>}
      <button className="botao botao-primario w-full" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar meus dados'}</button>
    </form>
  );
}

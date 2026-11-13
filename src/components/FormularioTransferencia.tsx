'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { transferirInscricaoAcao } from '@/app/inscricoes/acoes';
import { TAMANHOS_CAMISA, mascaraTelefone } from '@/lib/mascaras';
import { formatarCpf, limparCpf } from '@/lib/regras/cpf';

export function FormularioTransferencia({ inscricaoId, pedeCamisa, hoje }: { inscricaoId: string; pedeCamisa: boolean; hoje: string }) {
  const [f, setF] = useState({ nome: '', cpf: '', email: '', nascimento: '', sexo: '' as '' | 'F' | 'M', telefone: '', camisa: '', contatoEmergencia: '' });
  const [erros, setErros] = useState<string[]>([]);
  const [feito, setFeito] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [ocupado, iniciar] = useTransition();
  const campo = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  if (feito) {
    return (
      <section className="cartao">
        <div className="flex flex-col items-center gap-1.5 py-1.5 text-center">
          <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-ok-fundo text-3xl font-extrabold text-ok" aria-hidden>✓</div>
          <h2 className="titulo-2">Inscrição transferida</h2>
          <p className="text-suave">{f.nome} recebeu a confirmação em {f.email}. O número da inscrição continua o mesmo.</p>
        </div>
        <Link href="/minhas-inscricoes" className="botao botao-primario w-full">Voltar para minhas inscrições</Link>
      </section>
    );
  }

  const enviar = () =>
    iniciar(async () => {
      const r = await transferirInscricaoAcao(inscricaoId, { ...f, cpf: limparCpf(f.cpf), camisa: f.camisa || undefined, sexo: f.sexo || undefined });
      setConfirmar(false);
      if (r.ok) setFeito(true);
      else {
        setErros(r.erros);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

  return (
    <form
      className="cartao"
      aria-label="Novo participante"
      onSubmit={(e) => {
        e.preventDefault();
        setErros([]);
        setConfirmar(true);
      }}
    >
      <h2 className="titulo-3">Quem vai correr no seu lugar</h2>
      {erros.length > 0 && (
        <div className="erros" role="alert">
          <ul className="list-disc pl-5">{erros.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}
      <div className="campo"><label htmlFor="t-cpf">CPF</label><input id="t-cpf" className="entrada num" inputMode="numeric" placeholder="000.000.000-00" value={f.cpf} onChange={(e) => campo('cpf', formatarCpf(e.target.value))} required /></div>
      <div className="campo"><label htmlFor="t-nome">Nome completo</label><input id="t-nome" className="entrada" value={f.nome} onChange={(e) => campo('nome', e.target.value)} required /></div>
      <div className="campo">
        <label htmlFor="t-email">E-mail</label>
        <input id="t-email" className="entrada" type="email" value={f.email} onChange={(e) => campo('email', e.target.value)} required />
        <span className="dica">A pessoa recebe a confirmação nesse e-mail e vê a inscrição na conta dela.</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="campo"><label htmlFor="t-nasc">Nascimento</label><input id="t-nasc" className="entrada" type="date" max={hoje} value={f.nascimento} onChange={(e) => campo('nascimento', e.target.value)} required /></div>
        <div className="campo">
          <label htmlFor="t-sexo">Sexo</label>
          <select id="t-sexo" className="entrada" value={f.sexo} onChange={(e) => campo('sexo', e.target.value)} required>
            <option value="">Selecione</option><option value="F">Feminino</option><option value="M">Masculino</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="campo"><label htmlFor="t-tel">WhatsApp</label><input id="t-tel" className="entrada" inputMode="tel" value={f.telefone} onChange={(e) => campo('telefone', mascaraTelefone(e.target.value))} required /></div>
        {pedeCamisa && (
          <div className="campo">
            <label htmlFor="t-camisa">Camisa</label>
            <select id="t-camisa" className="entrada" value={f.camisa} onChange={(e) => campo('camisa', e.target.value)} required>
              <option value="">Tamanho</option>{TAMANHOS_CAMISA.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>
      <div className="campo"><label htmlFor="t-emerg">Contato de emergência</label><input id="t-emerg" className="entrada" placeholder="Nome e telefone" value={f.contatoEmergencia} onChange={(e) => campo('contatoEmergencia', e.target.value)} required /></div>

      {confirmar ? (
        <div className="flex flex-col gap-2 rounded-xl border border-alerta bg-alerta-fundo p-3">
          <b>Confirmar a transferência para {f.nome || 'esta pessoa'}?</b>
          <span className="text-sm">A inscrição deixa de ser sua e não há como desfazer pelo site.</span>
          <div className="flex gap-2">
            <button type="button" className="botao botao-primario" disabled={ocupado} onClick={enviar}>{ocupado ? 'Transferindo…' : 'Confirmar transferência'}</button>
            <button type="button" className="botao botao-borda" disabled={ocupado} onClick={() => setConfirmar(false)}>Voltar</button>
          </div>
        </div>
      ) : (
        <button className="botao botao-primario w-full">Transferir inscrição</button>
      )}
    </form>
  );
}

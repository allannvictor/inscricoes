'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { adicionarOrganizadorAcao, removerOrganizadorAcao, salvarPerfilAcao } from '@/app/painel/acoes';
import { COR_PADRAO, estiloDoTema, normalizarCor, temaDoClube } from '@/lib/regras/cores';
import { LIMITE_NOME_PRECO_ESPECIAL, nomePrecoEspecial } from '@/lib/regras/preco';

export function FormularioPerfil({ clubeId, inicial }: { clubeId: string; inicial: { nome: string; whatsapp: string; instagram: string; email: string; cor: string; nomePrecoEspecial: string } }) {
  const router = useRouter();
  const [f, setF] = useState(inicial);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();
  const campo = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await salvarPerfilAcao(clubeId, f);
          setMsg(r.ok ? { ok: true, texto: 'Perfil salvo.' } : { ok: false, texto: r.erros.join(' ') });
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <div className="campo"><label htmlFor="pf-nome">Nome do clube</label><input id="pf-nome" className="entrada" value={f.nome} onChange={(e) => campo('nome', e.target.value)} /></div>
        <div className="campo"><label htmlFor="pf-whats">WhatsApp para dúvidas (com DDD)</label><input id="pf-whats" className="entrada" inputMode="tel" value={f.whatsapp} onChange={(e) => campo('whatsapp', e.target.value)} /></div>
        <div className="campo"><label htmlFor="pf-insta">Instagram</label><input id="pf-insta" className="entrada" placeholder="@clube" value={f.instagram} onChange={(e) => campo('instagram', e.target.value)} /></div>
        <div className="campo"><label htmlFor="pf-email">E-mail de contato</label><input id="pf-email" className="entrada" type="email" value={f.email} onChange={(e) => campo('email', e.target.value)} /></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="campo">
          <label htmlFor="pf-cor">Cor de destaque</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              aria-label="Escolher a cor"
              className="h-[46px] w-[56px] flex-none cursor-pointer rounded-[9px] border border-linha bg-white p-1"
              value={normalizarCor(f.cor) ?? COR_PADRAO}
              onChange={(e) => campo('cor', e.target.value.toUpperCase())}
            />
            <input id="pf-cor" className="entrada num uppercase" placeholder={`${COR_PADRAO} (padrão)`} maxLength={7} value={f.cor} onChange={(e) => campo('cor', e.target.value)} />
            {f.cor && <button type="button" className="link flex-none text-sm" onClick={() => campo('cor', '')}>Usar padrão</button>}
          </div>
          <span className="dica">Usada nos botões, ícones e links das páginas do clube. Vazio: azul padrão da plataforma.</span>
          <div className="flex items-center gap-2 pt-1" style={estiloDoTema(temaDoClube(f.cor)) as React.CSSProperties}>
            <span className="botao botao-primario botao-pequeno" aria-hidden>Inscrever-se</span>
            <span className="link text-sm" aria-hidden>ver no mapa</span>
            <span className="dica">prévia</span>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="pf-preco">Nome do preço especial</label>
          <input
            id="pf-preco"
            className="entrada"
            placeholder="Sócio"
            maxLength={LIMITE_NOME_PRECO_ESPECIAL}
            value={f.nomePrecoEspecial}
            onChange={(e) => campo('nomePrecoEspecial', e.target.value)}
          />
          <span className="dica">
            Como o atleta vê o preço de quem está na lista de sócios, por exemplo &quot;Aluno CF&quot;. Até {LIMITE_NOME_PRECO_ESPECIAL} letras ({f.nomePrecoEspecial.length}/{LIMITE_NOME_PRECO_ESPECIAL}).
            Aparece como: <b>Preço {nomePrecoEspecial(f.nomePrecoEspecial)}</b>.
          </span>
        </div>
      </div>
      {msg && <p className={msg.ok ? 'text-sm text-ok' : 'erros'}>{msg.texto}</p>}
      <button className="botao botao-primario botao-pequeno self-start" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar perfil'}</button>
    </form>
  );
}

export function Organizadores({ clubeId, lista, euId }: { clubeId: string; lista: Array<{ id: string; email: string; nome: string | null }>; euId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {lista.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-linha px-3 py-2">
            <span>
              <b>{o.nome ?? o.email}</b>
              {o.nome && <span className="text-sm text-suave"> · {o.email}</span>}
              {o.id === euId && <span className="selo selo-neutro ml-1.5">você</span>}
            </span>
            {lista.length > 1 && (
              <button
                className="botao botao-borda botao-pequeno"
                disabled={ocupado}
                onClick={() => iniciar(async () => { const r = await removerOrganizadorAcao(clubeId, o.id); if (!r.ok) setErro(r.erros.join(' ')); router.refresh(); })}
              >
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await adicionarOrganizadorAcao(clubeId, email);
            if (!r.ok) return setErro(r.erros.join(' '));
            setErro(null);
            setEmail('');
            router.refresh();
          });
        }}
      >
        <div className="campo min-w-[240px] flex-1">
          <label htmlFor="org-email">Adicionar organizador (e-mail)</label>
          <input id="org-email" className="entrada" type="email" placeholder="pessoa@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button className="botao botao-borda" disabled={ocupado || !email}>Adicionar</button>
      </form>
      {erro && <p className="erros">{erro}</p>}
      <span className="dica">A pessoa entra em /painel com esse e-mail (código de 6 dígitos) e pode fazer tudo no clube: eventos, inscritos, cupons, sócios e perfil.</span>
    </div>
  );
}

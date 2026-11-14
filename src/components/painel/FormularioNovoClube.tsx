'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { criarClubeAcao } from '@/app/painel/acoes';
import { COR_PADRAO, estiloDoTema, normalizarCor, temaDoClube } from '@/lib/regras/cores';
import { LIMITE_NOME_PRECO_ESPECIAL } from '@/lib/regras/preco';
import { gerarSlug } from '@/lib/regras/slug';

export function FormularioNovoClube() {
  const router = useRouter();
  const [f, setF] = useState({ nome: '', slug: '', emailOrganizador: '', cor: '', nomePrecoEspecial: '' });
  const [slugEditado, setSlugEditado] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [ocupado, iniciar] = useTransition();
  const campo = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));
  const slug = slugEditado ? f.slug : gerarSlug(f.nome || '');

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await criarClubeAcao({ ...f, slug });
          if (!r.ok) return setErros(r.erros);
          router.push(`/painel/c/${r.slug}/perfil?criado=1`);
        });
      }}
    >
      {erros.length > 0 && <div className="erros" role="alert">{erros.join(' ')}</div>}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="campo">
          <label htmlFor="nc-nome">Nome do clube</label>
          <input id="nc-nome" className="entrada" required value={f.nome} onChange={(e) => campo('nome', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="nc-slug">Endereço no painel</label>
          <input
            id="nc-slug"
            className="entrada"
            value={slug}
            onChange={(e) => {
              setSlugEditado(true);
              campo('slug', e.target.value.toLowerCase());
            }}
          />
          <span className="dica">/painel/c/{gerarSlug(slug || f.nome || 'clube')}</span>
        </div>
        <div className="campo md:col-span-2">
          <label htmlFor="nc-email">E-mail do primeiro organizador</label>
          <input id="nc-email" className="entrada" type="email" required placeholder="organizador@clube.com" value={f.emailOrganizador} onChange={(e) => campo('emailOrganizador', e.target.value)} />
          <span className="dica">A pessoa recebe um convite por e-mail. Depois ela mesma adiciona outros organizadores e conecta o Mercado Pago do clube.</span>
        </div>
        <div className="campo">
          <label htmlFor="nc-cor">Cor de destaque <span className="font-normal text-suave">(opcional)</span></label>
          <div className="flex items-center gap-2">
            <input type="color" aria-label="Escolher a cor" className="h-[46px] w-[56px] flex-none cursor-pointer rounded-[9px] border border-linha bg-white p-1" value={normalizarCor(f.cor) ?? COR_PADRAO} onChange={(e) => campo('cor', e.target.value.toUpperCase())} />
            <input id="nc-cor" className="entrada num uppercase" placeholder={`${COR_PADRAO} (padrão)`} maxLength={7} value={f.cor} onChange={(e) => campo('cor', e.target.value)} />
          </div>
          <div className="pt-1" style={estiloDoTema(temaDoClube(f.cor)) as React.CSSProperties}>
            <span className="botao botao-primario botao-pequeno" aria-hidden>Inscrever-se</span>
          </div>
        </div>
        <div className="campo">
          <label htmlFor="nc-preco">Nome do preço especial <span className="font-normal text-suave">(opcional)</span></label>
          <input id="nc-preco" className="entrada" placeholder="Sócio" maxLength={LIMITE_NOME_PRECO_ESPECIAL} value={f.nomePrecoEspecial} onChange={(e) => campo('nomePrecoEspecial', e.target.value)} />
          <span className="dica">Ex.: &quot;Aluno CF&quot;. Até {LIMITE_NOME_PRECO_ESPECIAL} letras.</span>
        </div>
      </div>
      <button className="botao botao-primario self-start" disabled={ocupado}>{ocupado ? 'Criando…' : 'Criar clube e enviar convite'}</button>
    </form>
  );
}

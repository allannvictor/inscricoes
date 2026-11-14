'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { definirSenhaAcao, removerSenhaAcao } from '@/app/acoes';
import { SENHA_MINIMO } from '@/lib/regras/senha';

/** Meus dados → Acesso: criar, trocar ou remover a senha opcional. */
export function FormularioSenha({ temSenha }: { temSenha: boolean }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [senha, setSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [ocupado, iniciar] = useTransition();

  if (!aberto) {
    return (
      <div className="flex flex-col gap-2">
        {msg && <p className={msg.ok ? 'text-sm text-ok' : 'erros'} role="status">{msg.texto}</p>}
        <p className="text-sm">
          {temSenha ? 'Você pode entrar com e-mail e senha, ou com o código por e-mail.' : 'Hoje você entra com o código enviado ao e-mail. Se preferir, crie uma senha.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao botao-borda botao-pequeno" onClick={() => { setAberto(true); setMsg(null); }}>
            {temSenha ? 'Trocar senha' : 'Criar senha'}
          </button>
          {temSenha && (
            <button
              type="button"
              className="botao botao-borda botao-pequeno"
              disabled={ocupado}
              onClick={() =>
                iniciar(async () => {
                  const r = await removerSenhaAcao();
                  setMsg(r.ok ? { ok: true, texto: 'Senha removida. Agora você entra só com o código por e-mail.' } : { ok: false, texto: r.erro ?? 'Não foi possível.' });
                  router.refresh();
                })
              }
            >
              Remover senha
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      aria-label="Senha"
      onSubmit={(e) => {
        e.preventDefault();
        if (senha !== repetir) return setMsg({ ok: false, texto: 'As duas senhas não são iguais.' });
        iniciar(async () => {
          const r = await definirSenhaAcao(senha);
          if (!r.ok) return setMsg({ ok: false, texto: r.erro ?? 'Não foi possível salvar.' });
          setAberto(false);
          setSenha('');
          setRepetir('');
          setMsg({ ok: true, texto: 'Senha salva. Na próxima vez, use "Entrar com senha".' });
          router.refresh();
        });
      }}
    >
      {msg && !msg.ok && <p className="erros" role="alert">{msg.texto}</p>}
      <div className="campo">
        <label htmlFor="nova-senha">Nova senha</label>
        <input id="nova-senha" className="entrada" type="password" autoComplete="new-password" minLength={SENHA_MINIMO} required value={senha} onChange={(e) => setSenha(e.target.value)} />
        <span className="dica">Pelo menos {SENHA_MINIMO} caracteres. Uma frase curta é fácil de lembrar e difícil de adivinhar.</span>
      </div>
      <div className="campo">
        <label htmlFor="repetir-senha">Repita a senha</label>
        <input id="repetir-senha" className="entrada" type="password" autoComplete="new-password" required value={repetir} onChange={(e) => setRepetir(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="botao botao-primario botao-pequeno" disabled={ocupado}>{ocupado ? 'Salvando…' : 'Salvar senha'}</button>
        <button type="button" className="botao botao-borda botao-pequeno" onClick={() => { setAberto(false); setMsg(null); }}>Cancelar</button>
      </div>
    </form>
  );
}

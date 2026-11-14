'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { definirSenhaAcao, enviarCodigoSenhaAcao, removerSenhaAcao } from '@/app/acoes';
import { SENHA_MINIMO } from '@/lib/regras/senha';

type Modo = 'fechado' | 'salvar' | 'remover';
type Msg = { ok: boolean; texto: string } | null;

/**
 * Meus dados → Acesso: criar, trocar ou remover a senha opcional.
 * Trocar ou remover pede a senha atual; quem esqueceu recebe um código no e-mail (pedido do Allan, 14/11/2026).
 */
export function FormularioSenha({ temSenha }: { temSenha: boolean }) {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>('fechado');
  const [senha, setSenha] = useState('');
  const [repetir, setRepetir] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [codigo, setCodigo] = useState('');
  const [usarCodigo, setUsarCodigo] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [ocupado, iniciar] = useTransition();

  const abrir = (m: Modo) => {
    setModo(m);
    setMsg(null);
    setSenha('');
    setRepetir('');
    setSenhaAtual('');
    setCodigo('');
    setUsarCodigo(false);
  };
  const confirmacao = () => (usarCodigo ? { codigo } : { senhaAtual });

  if (modo === 'fechado') {
    return (
      <div className="flex flex-col gap-2">
        {msg && <p className={msg.ok ? 'text-sm text-ok' : 'erros'} role="status">{msg.texto}</p>}
        <p className="text-sm">
          {temSenha ? 'Você pode entrar com e-mail e senha, ou com o código por e-mail.' : 'Hoje você entra com o código enviado ao e-mail. Se preferir, crie uma senha.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="botao botao-borda botao-pequeno" onClick={() => abrir('salvar')}>
            {temSenha ? 'Trocar senha' : 'Criar senha'}
          </button>
          {temSenha && (
            <button type="button" className="botao botao-borda botao-pequeno" onClick={() => abrir('remover')}>
              Remover senha
            </button>
          )}
        </div>
      </div>
    );
  }

  /** Senha atual, ou o código enviado ao e-mail para quem esqueceu. */
  const campoConfirmacao = temSenha && (
    <div className="campo">
      {usarCodigo ? (
        <>
          <label htmlFor="codigo-senha">Código enviado ao seu e-mail</label>
          <input id="codigo-senha" className="entrada" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          <span className="dica">Vale por 10 minutos. Confira também a caixa de spam.</span>
        </>
      ) : (
        <>
          <label htmlFor="senha-atual">Senha atual</label>
          <input id="senha-atual" className="entrada" type="password" autoComplete="current-password" required value={senhaAtual} onChange={(e) => setSenhaAtual(e.target.value)} />
          <button
            type="button"
            className="link self-start text-sm"
            disabled={ocupado}
            onClick={() =>
              iniciar(async () => {
                const r = await enviarCodigoSenhaAcao();
                if (!r.ok) return setMsg({ ok: false, texto: r.erro ?? 'Não foi possível enviar o código.' });
                setUsarCodigo(true);
                setMsg({ ok: true, texto: 'Enviamos um código para o seu e-mail.' });
              })
            }
          >
            Esqueci a senha atual
          </button>
        </>
      )}
    </div>
  );

  const avisos = msg && <p className={msg.ok ? 'text-sm text-ok' : 'erros'} role={msg.ok ? 'status' : 'alert'}>{msg.texto}</p>;
  const cancelar = (
    <button type="button" className="botao botao-borda botao-pequeno" onClick={() => abrir('fechado')}>Cancelar</button>
  );

  if (modo === 'remover') {
    return (
      <form
        className="flex flex-col gap-3"
        aria-label="Remover senha"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await removerSenhaAcao(confirmacao());
            if (!r.ok) return setMsg({ ok: false, texto: r.erro ?? 'Não foi possível remover.' });
            setModo('fechado');
            setMsg({ ok: true, texto: 'Senha removida. Agora você entra só com o código por e-mail.' });
            router.refresh();
          });
        }}
      >
        <p className="text-sm">Para remover a senha, confirme que é você.</p>
        {avisos}
        {campoConfirmacao}
        <div className="flex gap-2">
          <button className="botao botao-primario botao-pequeno" disabled={ocupado}>{ocupado ? 'Removendo…' : 'Confirmar remoção'}</button>
          {cancelar}
        </div>
      </form>
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
          const r = await definirSenhaAcao(senha, confirmacao());
          if (!r.ok) return setMsg({ ok: false, texto: r.erro ?? 'Não foi possível salvar.' });
          setModo('fechado');
          setMsg({ ok: true, texto: 'Senha salva. Na próxima vez, use "Entrar com senha".' });
          router.refresh();
        });
      }}
    >
      {avisos}
      {campoConfirmacao}
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
        {cancelar}
      </div>
    </form>
  );
}

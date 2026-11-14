'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { entrarComSenhaAcao, solicitarCodigoAcao, verificarCodigoAcao } from '@/app/acoes';
import { destinoInterno } from '@/lib/regras/redirecionamento';

/**
 * Entrar: código de 6 dígitos no e-mail (padrão; a conta é criada no primeiro acesso),
 * senha (opcional, para quem criou uma em Meus dados) ou Google (quando configurado).
 */
export function LoginCodigo({ destino, modoTeste = false, google = false, erroInicial = null }: { destino: string; modoTeste?: boolean; google?: boolean; erroInicial?: string | null }) {
  const router = useRouter();
  const [modo, setModo] = useState<'codigo' | 'senha'>('codigo');
  const [senha, setSenha] = useState('');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(erroInicial);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const pedirCodigo = () =>
    iniciar(async () => {
      setErro(null);
      const r = await solicitarCodigoAcao(email);
      if (!r.ok) return setErro(r.erro ?? 'Não foi possível enviar o código.');
      setEnviado(true);
      setAviso(modoTeste ? `Ambiente de teste: digite o código de teste que você recebeu junto com o link (nenhum e-mail é enviado).` : `Enviamos um código para ${email.trim()}.`);
    });

  const entrarSenha = () =>
    iniciar(async () => {
      setErro(null);
      const r = await entrarComSenhaAcao(email, senha);
      if (!r.ok) return setErro(r.erro ?? 'Não foi possível entrar.');
      router.replace(destinoInterno(destino));
      router.refresh();
    });

  const botaoGoogle = google && (
    <a className="botao botao-borda w-full" href={`/api/auth/google?voltar=${encodeURIComponent(destino)}`}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
        <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      Entrar com Google
    </a>
  );

  if (modo === 'senha') {
    return (
      <section className="cartao">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            entrarSenha();
          }}
        >
          <h1 className="titulo-2">Entrar com senha</h1>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="entrada" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input id="senha" className="entrada" type="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && <p className="erros" role="alert">{erro}</p>}
          <button className="botao botao-primario w-full" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <button type="button" className="link" onClick={() => { setModo('codigo'); setErro(null); }}>← Voltar</button>
            <button
              type="button"
              className="link"
              onClick={() => {
                setModo('codigo');
                setErro(null);
                setAviso(null);
              }}
            >
              Esqueci a senha
            </button>
          </div>
          <p className="dica">Esqueceu a senha? Entre com o código por e-mail e crie outra em Meus dados.</p>
        </form>
      </section>
    );
  }

  const entrar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await verificarCodigoAcao(email, codigo);
      if (!r.ok) return setErro(r.erro ?? 'Código inválido.');
      router.replace(destinoInterno(destino));
      router.refresh();
    });

  return (
    <section className="cartao">
      {!enviado ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            pedirCodigo();
          }}
        >
          <h1 className="titulo-2">Entre com seu e-mail</h1>
          <p className="text-suave">Enviamos um código de 6 dígitos. Se for sua primeira vez, sua conta é criada agora.</p>
          <div className="campo">
            <label htmlFor="email">E-mail</label>
            <input id="email" className="entrada" type="email" inputMode="email" autoComplete="email" required placeholder="voce@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {erro && <p className="erros" role="alert">{erro}</p>}
          <button className="botao botao-primario w-full" disabled={ocupado}>{ocupado ? 'Enviando…' : 'Receber código'}</button>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[.08em] text-suave" aria-hidden>
            <span className="h-px flex-1 bg-linha" />ou<span className="h-px flex-1 bg-linha" />
          </div>
          {botaoGoogle}
          <button type="button" className="botao botao-borda w-full" onClick={() => { setModo('senha'); setErro(null); }}>Entrar com senha</button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            entrar();
          }}
        >
          <h1 className="titulo-2">Digite o código</h1>
          <p className="text-suave">{modoTeste ? aviso : `${aviso} Ele vale por 10 minutos. Confira também o spam.`}</p>
          <div className="campo">
            <label htmlFor="codigo">Código</label>
            <input
              id="codigo"
              className="entrada num h-14 text-center font-display text-2xl font-bold tracking-[.3em]"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
              autoFocus
            />
          </div>
          {erro && <p className="erros" role="alert">{erro}</p>}
          <button className="botao botao-primario w-full" disabled={ocupado || codigo.length !== 6}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
          <div className="flex justify-between text-sm">
            <button type="button" className="link" onClick={() => { setEnviado(false); setCodigo(''); setErro(null); }}>Trocar e-mail</button>
            <button type="button" className="link" disabled={ocupado} onClick={pedirCodigo}>Reenviar código</button>
          </div>
        </form>
      )}
    </section>
  );
}

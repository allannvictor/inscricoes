'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { solicitarCodigoAcao, verificarCodigoAcao } from '@/app/acoes';

/** Entrar com e-mail + código de 6 dígitos. A conta é criada no primeiro acesso. */
export function LoginCodigo({ destino }: { destino: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const pedirCodigo = () =>
    iniciar(async () => {
      setErro(null);
      const r = await solicitarCodigoAcao(email);
      if (!r.ok) return setErro(r.erro ?? 'Não foi possível enviar o código.');
      setEnviado(true);
      setAviso(`Enviamos um código para ${email.trim()}.`);
    });

  const entrar = () =>
    iniciar(async () => {
      setErro(null);
      const r = await verificarCodigoAcao(email, codigo);
      if (!r.ok) return setErro(r.erro ?? 'Código inválido.');
      router.replace(destino);
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
          <p className="text-suave">{aviso} Ele vale por 10 minutos. Confira também o spam.</p>
          <div className="campo">
            <label htmlFor="codigo">Código</label>
            <input
              id="codigo"
              className="entrada num text-center font-display text-2xl font-bold tracking-[.3em]"
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

/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { IconeCalendario, IconeLocal } from '@/components/Icones';
import { TemaClube } from '@/components/TemaClube';
import { usuarioAtual } from '@/lib/auth/sessao';
import { eventosAbertos, inscricoesAbertas } from '@/lib/pedidos/consultas';
import { formatarDataHora, textoFaltam } from '@/lib/regras/datas';

export const dynamic = 'force-dynamic';

export default async function Inicio() {
  const [lista, usuario] = await Promise.all([eventosAbertos(), usuarioAtual()]);
  const agora = new Date();
  return (
    <div className="mx-auto flex max-w-[1120px] flex-col gap-4 px-4 py-5 lg:py-8">
      {/* Para quem ainda não entrou: convite para criar a conta (pedido do Allan, 14/11/2026). */}
      {!usuario && (
        <section className="cartao flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="titulo-criar-conta">
          <div className="flex flex-col gap-1">
            <h2 id="titulo-criar-conta" className="titulo-3">Crie sua conta</h2>
            <p className="text-sm text-suave">
              É grátis e leva 1 minuto: digite seu e-mail e o código que enviamos. Com a conta, você se inscreve mais rápido e acompanha suas inscrições.
            </p>
          </div>
          <Link href="/entrar?voltar=/minhas-inscricoes" className="botao botao-primario shrink-0 self-start sm:self-auto">Criar minha conta</Link>
        </section>
      )}
      <h1 className="titulo-2 lg:text-[2rem]">Próximos eventos</h1>
      {lista.length === 0 && <p className="text-suave">Nenhum evento com inscrições abertas agora.</p>}
      {/* Celular: uma coluna. Computador: grade de cartões. */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(({ evento, clube }) => {
          const faltam = textoFaltam(evento.dataHora, agora);
          return (
            <li key={evento.id}>
              <TemaClube cor={clube.cor} className="h-full">
                <Link
                  href={`/eventos/${evento.slug}`}
                  className="flex h-full flex-col overflow-hidden rounded-2xl bg-white no-underline shadow-[0_2px_10px_rgba(20,32,56,.06)] transition-shadow hover:shadow-[0_6px_24px_rgba(20,32,56,.12)]"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-acao">
                    {evento.capaUrl ? (
                      <img src={evento.capaUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full items-center justify-center font-display text-5xl font-extrabold uppercase text-[color:var(--color-acao-texto)] opacity-25" aria-hidden>
                        {clube.nome.split(/\s+/)[0]}
                      </span>
                    )}
                    {faltam && <span className="selo selo-neutro absolute left-3 top-3 border-0 bg-white/95">{faltam}</span>}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <span className="text-xs font-bold uppercase tracking-[.1em] text-[color:var(--color-acao-tinta)]">{clube.nome}</span>
                    <span className="titulo-3 text-[1.35rem] leading-tight">{evento.nome}</span>
                    <span className="flex items-center gap-2 text-sm text-suave">
                      <IconeCalendario className="h-4 w-4 text-[color:var(--color-acao-tinta)]" />
                      {formatarDataHora(evento.dataHora)}
                    </span>
                    <span className="flex items-start gap-2 text-sm text-suave">
                      <IconeLocal className="mt-0.5 h-4 w-4 text-[color:var(--color-acao-tinta)]" />
                      {evento.local}
                    </span>
                    <span className="mt-auto pt-2">
                      {inscricoesAbertas(evento) ? <span className="selo selo-ok">Inscrições abertas</span> : <span className="selo selo-neutro">Inscrições encerradas</span>}
                    </span>
                  </div>
                </Link>
              </TemaClube>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

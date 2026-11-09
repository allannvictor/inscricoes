import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, Capa } from '@/components/Capa';
import { ehOrganizadorDoClube } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { eventoPorSlug, inscricoesAbertas } from '@/lib/pedidos/consultas';
import { formatarDataHora, formatarDiaMes, formatarHora } from '@/lib/regras/datas';
import { formatarReais } from '@/lib/regras/preco';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const dados = await eventoPorSlug((await params).slug);
  if (!dados) return {};
  const { evento, clube } = dados;
  const descricao = `${formatarDataHora(evento.dataHora)} · ${evento.local} · ${clube.nome}`;
  return {
    title: evento.nome,
    description: descricao,
    // Prévia do link no WhatsApp/Instagram.
    openGraph: { title: evento.nome, description: descricao, images: evento.capaUrl ? [evento.capaUrl] : [] },
  };
}

export default async function PaginaEvento({ params }: Props) {
  const { slug } = await params;
  let dados = await eventoPorSlug(slug);
  if (!dados) {
    // Rascunho: só organizadores do clube (ou master) conseguem ver, para conferir antes de publicar.
    const rascunho = await eventoPorSlug(slug, true);
    if (rascunho && ehOrganizadorDoClube(paraPermissao(await usuarioAtual()), rascunho.clube.id)) dados = rascunho;
  }
  if (!dados) notFound();
  const { evento, clube, distancias } = dados;
  const aberto = inscricoesAbertas(evento);

  return (
    <div className="pagina">
      {evento.status === 'rascunho' && (
        <div className="erros"><b>Rascunho.</b> Só organizadores veem esta página. Publique no painel para abrir as inscrições.</div>
      )}
      <Capa src={evento.capaUrl} alt={`Imagem do ${evento.nome}`} />
      <section className="flex flex-col gap-2.5 rounded-xl bg-fundo2 p-[18px]">
        <span className="text-xs font-bold uppercase tracking-[.1em] text-acao">{clube.nome}</span>
        <h1 className="titulo-1">{evento.nome}</h1>
        <dl className="mt-1 grid grid-cols-2 gap-2.5">
          <Info rotulo="Data" valor={formatarDataHora(evento.dataHora)} />
          <Info rotulo="Largada" valor={formatarHora(evento.dataHora)} />
          <Info rotulo="Local" valor={evento.local} />
          <Info rotulo="Inscrições" valor={aberto ? `até ${formatarDiaMes(evento.inscricoesAte)}` : 'encerradas'} />
        </dl>
      </section>

      <section className="cartao">
        <h2 className="titulo-2">Distâncias</h2>
        <div>
          {distancias.map((d, i) => (
            <div key={d.id} className={`grid grid-cols-[1fr_auto] items-center gap-3 py-3 ${i ? 'border-t border-linha' : 'pt-0'}`}>
              <span className="font-display text-[1.6rem] font-extrabold leading-none">{d.nome}</span>
              <div className="text-right">
                <div className="num font-bold">{formatarReais(d.precoCentavos)}</div>
                {evento.precoSocioAtivo && d.precoSocioCentavos != null && (
                  <div className="num text-xs font-semibold text-ok">sócio {formatarReais(d.precoSocioCentavos)}</div>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-suave">
          {evento.precoSocioAtivo && 'Preço de sócio aplicado automaticamente pelo CPF. '}
          Pessoas com 60 anos ou mais pagam meia (Estatuto da Pessoa Idosa), aplicada pela data de nascimento.
        </p>
      </section>

      {(evento.descricao || evento.transferenciaAte || evento.regulamentoUrl) && (
        <section className="cartao">
          {evento.descricao && (
            <>
              <h3 className="titulo-3">Informações</h3>
              <p className="whitespace-pre-line">{evento.descricao}</p>
            </>
          )}
          {evento.transferenciaAte && (
            <>
              <h3 className="titulo-3">Transferência</h3>
              <p>Não há reembolso, mas você pode transferir sua inscrição para outra pessoa até {formatarDiaMes(evento.transferenciaAte)}.</p>
            </>
          )}
          {evento.regulamentoUrl && (
            <a className="link self-start" href={evento.regulamentoUrl} target="_blank" rel="noreferrer">Ver regulamento</a>
          )}
        </section>
      )}

      <section className="cartao">
        <span className="rotulo">Organização</span>
        <div className="flex items-center gap-3">
          <Avatar src={clube.fotoUrl} nome={clube.nome} />
          <div className="flex flex-col">
            <b>{clube.nome}</b>
            {clube.instagram && <span className="text-sm text-suave">{clube.instagram}</span>}
          </div>
        </div>
        {clube.whatsapp && (
          <a className="botao botao-borda botao-pequeno self-start" href={`https://wa.me/${clube.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
            Falar no WhatsApp
          </a>
        )}
      </section>

      <div className="fixo-baixo">
        {aberto ? (
          <Link href={`/eventos/${evento.slug}/inscricao`} className="botao botao-primario w-full">Inscrever-se</Link>
        ) : (
          <span className="botao botao-borda w-full">Inscrições encerradas</span>
        )}
      </div>
    </div>
  );
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs uppercase tracking-[.08em] text-suave">{rotulo}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}

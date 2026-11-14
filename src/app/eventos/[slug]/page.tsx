/* eslint-disable @next/next/no-img-element */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/Capa';
import { IconeAgenda, IconeCadeado, IconeCalendario, IconeCompartilhar, IconeLocal, IconeRelogio, IconeSeta } from '@/components/Icones';
import { TemaClube } from '@/components/TemaClube';
import { linkMapa, linkWhatsappCompartilhar } from '@/lib/agenda';
import { ehOrganizadorDoClube } from '@/lib/auth/permissoes';
import { paraPermissao, usuarioAtual } from '@/lib/auth/sessao';
import { eventoPorSlug, inscricoesAbertas } from '@/lib/pedidos/consultas';
import { formatarDataHora, formatarDiaMes, formatarHora, textoFaltam } from '@/lib/regras/datas';
import { formatarReais, nomePrecoEspecial } from '@/lib/regras/preco';

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
  const agora = new Date();
  const faltam = textoFaltam(evento.dataHora, agora);
  const menorPreco = distancias.length ? Math.min(...distancias.map((d) => d.precoCentavos)) : 0;
  const especial = nomePrecoEspecial(clube.nomePrecoEspecial);
  const temEspecial = evento.precoSocioAtivo && distancias.some((d) => d.precoSocioCentavos != null);
  const urlPagina = `${process.env.APP_URL ?? ''}/eventos/${evento.slug}`;
  const linkInscricao = `/eventos/${evento.slug}/inscricao`;

  return (
    <TemaClube cor={clube.cor} className="pb-28 lg:pb-12">
      {evento.status === 'rascunho' && (
        <div className="mx-auto max-w-[1120px] px-4 py-3">
          <div className="erros"><b>Rascunho.</b> Só organizadores veem esta página. Publique no painel para abrir as inscrições.</div>
        </div>
      )}
      {/* Topo: foto do evento, ou a cor do clube quando não há foto. */}
      <div className="relative h-[240px] overflow-hidden bg-acao sm:h-[300px] lg:h-[340px]">
        {evento.capaUrl ? (
          <img src={evento.capaUrl} alt={`Imagem do ${evento.nome}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center" aria-hidden>
            <span className="font-display text-[5rem] font-extrabold uppercase leading-none tracking-wide text-[color:var(--color-acao-texto)] opacity-20">
              {clube.nome.split(/\s+/)[0]}
            </span>
          </div>
        )}
      </div>

      {/*
        Celular: uma coluna (cartão, distâncias, textos, organização).
        Computador: conteúdo à esquerda e distâncias + botão fixos na lateral direita.
        A coluna da esquerda usa "contents" no celular para as distâncias entrarem logo depois do cartão.
      */}
      <div className="relative mx-auto -mt-14 flex max-w-[1120px] flex-col gap-3.5 px-4 lg:-mt-24 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        <div className="contents lg:flex lg:flex-col lg:gap-4">
        {/* Cartão principal, flutuando sobre a foto */}
        <section className="cartao order-1 gap-3.5 rounded-2xl border-0 p-[18px] shadow-[0_6px_24px_rgba(20,32,56,.10)] lg:order-none lg:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Avatar src={clube.fotoUrl} nome={clube.nome} pequeno />
            <span className="text-sm font-semibold text-suave">{clube.nome}</span>
            <span className="ml-auto flex flex-wrap gap-1.5">
              {aberto ? <span className="selo selo-ok">Inscrições abertas</span> : <span className="selo selo-neutro">Inscrições encerradas</span>}
              {faltam && <span className="selo selo-neutro">{faltam}</span>}
            </span>
          </div>
          <h1 className="titulo-1 text-[2.2rem] leading-none lg:text-[3.2rem]">{evento.nome}</h1>
          <ul className="flex flex-col gap-2.5 text-[.95rem] lg:grid lg:grid-cols-3 lg:gap-3">
            <Item icone={<IconeCalendario />} rotulo="Data">
              <b>{formatarDataHora(evento.dataHora)}</b>
            </Item>
            <Item icone={<IconeRelogio />} rotulo="Largada">
              <b>{formatarHora(evento.dataHora)}</b>
              {aberto && <span className="text-suave"> · inscrições até {formatarDiaMes(evento.inscricoesAte)}</span>}
            </Item>
            <Item icone={<IconeLocal />} rotulo="Local">
              <span>{evento.local}</span>{' '}
              <a className="link whitespace-nowrap" href={linkMapa(evento.local)} target="_blank" rel="noreferrer">ver no mapa</a>
            </Item>
          </ul>
          <div className="grid grid-cols-2 gap-2 lg:flex lg:flex-wrap">
            <a className="botao botao-borda botao-pequeno" href={`/eventos/${evento.slug}/agenda.ics`}>
              <IconeAgenda className="text-[color:var(--color-acao-tinta)]" /> Adicionar à agenda
            </a>
            <a className="botao botao-borda botao-pequeno" href={linkWhatsappCompartilhar(evento.nome, urlPagina)} target="_blank" rel="noreferrer">
              <IconeCompartilhar className="text-[color:var(--color-acao-tinta)]" /> Compartilhar
            </a>
          </div>
        </section>

        {/* Textos longos em sanfonas */}
        {(evento.descricao || evento.transferenciaAte || evento.regulamentoUrl) && (
          <section className="cartao order-3 gap-0 rounded-2xl border-0 p-0 lg:order-none">
            {evento.descricao && (
              <Sanfona titulo="Sobre o evento" aberta>
                <p className="whitespace-pre-line">{evento.descricao}</p>
              </Sanfona>
            )}
            <Sanfona titulo="Local e como chegar">
              <p>{evento.local}</p>
              <a className="link self-start" href={linkMapa(evento.local)} target="_blank" rel="noreferrer">Abrir no mapa</a>
            </Sanfona>
            {evento.transferenciaAte && (
              <Sanfona titulo={`Transferência até ${formatarDiaMes(evento.transferenciaAte)}`}>
                <p>Não há reembolso, mas você pode transferir sua inscrição para outra pessoa até {formatarDiaMes(evento.transferenciaAte)}, em Minhas inscrições.</p>
              </Sanfona>
            )}
            {evento.regulamentoUrl && (
              <Sanfona titulo="Regulamento e termo">
                <a className="link self-start" href={evento.regulamentoUrl} target="_blank" rel="noreferrer">Ver regulamento</a>
              </Sanfona>
            )}
          </section>
        )}

        <section className="cartao order-4 rounded-2xl border-0 lg:order-none">
          <span className="rotulo">Organização</span>
          <div className="flex items-center gap-3">
            <Avatar src={clube.fotoUrl} nome={clube.nome} />
            <div className="flex min-w-0 flex-1 flex-col">
              <b>{clube.nome}</b>
              {clube.instagram && <span className="text-sm text-suave">{clube.instagram}</span>}
            </div>
            {clube.whatsapp && (
              <a className="botao botao-borda botao-pequeno" href={`https://wa.me/${clube.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
          </div>
        </section>
        </div>

        {/* Distâncias e inscrição: no computador, fixo na lateral. */}
        <aside className="cartao order-2 rounded-2xl border-0 p-[18px] lg:sticky lg:top-4 lg:order-none lg:shadow-[0_6px_24px_rgba(20,32,56,.10)]" aria-label="Distâncias e preços">
          <h2 className="titulo-2">Escolha a distância</h2>
          <ul className="flex flex-col gap-2">
            {distancias.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-linha px-3.5 py-2.5">
                <span className="font-display text-[1.6rem] font-extrabold leading-none">{d.nome}</span>
                <span className="text-right">
                  <b className="num block">{formatarReais(d.precoCentavos)}</b>
                  {temEspecial && d.precoSocioCentavos != null && (
                    <span className="num block text-xs font-semibold text-ok">{especial} {formatarReais(d.precoSocioCentavos)}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-suave">
            {temEspecial && `Preço ${especial} aplicado automaticamente pelo CPF. `}
            Pessoas com 60 anos ou mais pagam meia (Estatuto da Pessoa Idosa).
          </p>
          <div className="hidden flex-col gap-2 lg:flex">
            <BotaoInscricao aberto={aberto} href={linkInscricao} />
            <Confianca />
          </div>
        </aside>

        <div className="order-5 lg:hidden">
          <Confianca />
        </div>
      </div>

      {/* Celular: barra fixa embaixo com o menor preço e o botão. */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-white px-4 pb-[calc(12px+env(safe-area-inset-bottom,0px))] pt-3 shadow-[0_-4px_16px_rgba(20,32,56,.08)] lg:hidden">
        <div className="mx-auto flex max-w-[1120px] items-center gap-3">
          {aberto && distancias.length > 0 && (
            <div className="flex-none leading-tight">
              <div className="text-xs text-suave">a partir de</div>
              <div className="num text-lg font-bold">{formatarReais(menorPreco)}</div>
            </div>
          )}
          <BotaoInscricao aberto={aberto} href={linkInscricao} />
        </div>
      </div>
    </TemaClube>
  );
}

function BotaoInscricao({ aberto, href }: { aberto: boolean; href: string }) {
  return aberto ? (
    <Link href={href} className="botao botao-primario w-full flex-1 py-3.5">Inscrever-se</Link>
  ) : (
    <span className="botao botao-borda w-full flex-1">Inscrições encerradas</span>
  );
}

function Confianca() {
  return (
    <p className="flex items-center justify-center gap-2 text-xs text-suave">
      <IconeCadeado className="h-4 w-4" /> Pagamento seguro com Pix via Mercado Pago
    </p>
  );
}

function Item({ icone, rotulo, children }: { icone: React.ReactNode; rotulo: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 lg:flex-col lg:gap-1 lg:rounded-xl lg:bg-fundo2 lg:px-3.5 lg:py-3">
      <span className="mt-0.5 text-[color:var(--color-acao-tinta)] lg:mt-0">{icone}</span>
      <span className="min-w-0">
        <span className="sr-only lg:not-sr-only lg:block lg:text-xs lg:uppercase lg:tracking-[.08em] lg:text-suave">
          {rotulo}
          <span className="sr-only">: </span>
        </span>
        {children}
      </span>
    </li>
  );
}

function Sanfona({ titulo, aberta, children }: { titulo: string; aberta?: boolean; children: React.ReactNode }) {
  return (
    <details className="group border-b border-linha last:border-b-0" open={aberta}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 font-bold [&::-webkit-details-marker]:hidden">
        {titulo}
        <IconeSeta className="text-suave transition-transform group-open:rotate-90" />
      </summary>
      <div className="flex flex-col gap-2 px-4 pb-4">{children}</div>
    </details>
  );
}

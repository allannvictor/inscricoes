'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { criarPedidoAcao, validarCupomAcao, verificarCpfAcao } from '@/app/acoes';
import { formatarCpf, limparCpf, mascararCpf, validarCpf } from '@/lib/regras/cpf';
import { cadastroCompleto, faltasDaPessoa } from '@/lib/regras/participante';
import { calcularPedido } from '@/lib/regras/pedido';
import { NOME_MOTIVO, ehIdoso, formatarReais, precoParticipante } from '@/lib/regras/preco';
import { TAMANHOS_CAMISA as TAMANHOS, mascaraTelefone } from '@/lib/mascaras';


type Sexo = 'F' | 'M' | '';
interface Participante {
  distanciaId: string;
  nome: string;
  cpf: string;
  email: string;
  nascimento: string;
  sexo: Sexo;
  telefone: string;
  camisa: string;
  contatoEmergencia: string;
}

interface Props {
  voltar: React.ReactNode;
  evento: { id: string; precoSocioAtivo: boolean; pedeCamisa: boolean; usaCategoria: boolean; dataEvento: string; regulamentoUrl: string | null };
  distancias: Array<{ id: string; nome: string; precoCentavos: number; precoSocioCentavos: number | null }>;
  hoje: string;
  emailConta: string;
  perfil: Omit<Participante, 'distanciaId' | 'email'>;
  /** Inscrição ativa do dono da conta neste evento, se houver. */
  jaInscrito: { numero: number | null; pago: boolean; pedidoId: string | null } | null;
  /** Pessoas que esta conta já inscreveu antes, para adicionar com um toque. */
  pessoasSalvas: Array<Omit<Participante, 'distanciaId'>>;
}

const NOME_SEXO: Record<string, string> = { F: 'Feminino', M: 'Masculino' };
const dataBr = (iso: string) => iso.split('-').reverse().join('/');

const vazio = (): Participante => ({ distanciaId: '', nome: '', cpf: '', email: '', nascimento: '', sexo: '', telefone: '', camisa: '', contatoEmergencia: '' });

export function FormularioInscricao({ voltar, evento, distancias, hoje, emailConta, perfil, jaInscrito, pessoasSalvas }: Props) {
  const router = useRouter();
  const distanciaUnica = distancias.length === 1 ? distancias[0].id : '';
  // Cadastro completo: "Você" aparece em resumo; os campos só abrem em "Alterar".
  const [editandoEu, setEditandoEu] = useState(() => !!jaInscrito || !cadastroCompleto(perfil, evento, hoje));
  const [participantes, setParticipantes] = useState<Participante[]>([
    // Se a pessoa já está inscrita, o formulário começa vazio (para inscrever outra pessoa).
    jaInscrito
      ? { ...vazio(), distanciaId: distanciaUnica }
      : { ...vazio(), ...perfil, cpf: perfil.cpf ? formatarCpf(perfil.cpf) : '', distanciaId: distanciaUnica },
  ]);
  const [infoCpf, setInfoCpf] = useState<Record<string, { socio: boolean; jaInscrito: boolean }>>({});
  const [cupomTxt, setCupomTxt] = useState('');
  const [cupom, setCupom] = useState<{ codigo: string; tipo: 'percentual' | 'valor'; valor: number } | null>(null);
  const [cupomMsg, setCupomMsg] = useState<string | null>(null);
  const [aceite, setAceite] = useState(false);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, iniciar] = useTransition();

  // Pergunta ao servidor, para cada CPF válido: é sócio? já está inscrito neste evento?
  const cpfsValidos = participantes.map((p) => limparCpf(p.cpf)).filter(validarCpf);
  const chaveCpfs = cpfsValidos.join(',');
  useEffect(() => {
    const faltam = chaveCpfs.split(',').filter((c) => c && !(c in infoCpf));
    faltam.forEach((cpf) => {
      verificarCpfAcao(evento.id, cpf).then((info) => setInfoCpf((s) => ({ ...s, [cpf]: info })));
    });
  }, [chaveCpfs, evento.id, infoCpf]);

  const cpfsSocios = useMemo(() => new Set(Object.entries(infoCpf).filter(([, v]) => v.socio).map(([k]) => k)), [infoCpf]);
  const cpfJaInscrito = (cpf: string) => !!infoCpf[limparCpf(cpf)]?.jaInscrito;
  const faltaDistancia = participantes.some((p) => !p.distanciaId);
  const calculo = calcularPedido({
    participantes: participantes.map((p) => ({ distanciaId: p.distanciaId, cpf: p.cpf, nascimento: p.nascimento, sexo: p.sexo })),
    distancias,
    precoSocioAtivo: evento.precoSocioAtivo,
    usaCategoria: evento.usaCategoria,
    cpfsSocios,
    cupom,
    dataInscricao: hoje,
    dataEvento: evento.dataEvento,
  });

  // Pessoas já inscritas antes que ainda não estão neste pedido.
  const cpfsNoPedido = new Set(participantes.map((p) => limparCpf(p.cpf)));
  const sugestoes = pessoasSalvas.filter((p) => !cpfsNoPedido.has(p.cpf));

  const alterar = (i: number, campo: keyof Participante, valor: string) =>
    setParticipantes((lista) => lista.map((p, j) => (j === i ? { ...p, [campo]: valor } : p)));

  const aplicarCupom = async () => {
    const r = await validarCupomAcao(evento.id, cupomTxt);
    if (!r.ok) {
      setCupom(null);
      setCupomMsg(r.erro);
      return;
    }
    setCupom(r);
    setCupomMsg(null);
  };

  const validarNaTela = (): string[] => {
    const lista: string[] = [];
    participantes.forEach((p, i) => {
      const quem = i === 0 ? 'Você' : `Participante ${i + 1}`;
      const falta = faltasDaPessoa(p, evento, hoje);
      if (!p.distanciaId) falta.unshift('distância');
      if (validarCpf(p.cpf) && cpfJaInscrito(p.cpf)) lista.push(`${quem}: este CPF já está inscrito neste evento.`);
      if (falta.length) {
        lista.push(`${quem}: ${falta.join(', ')}`);
        if (i === 0) setEditandoEu(true); // abre os campos para corrigir
      }
    });
    const cpfs = participantes.map((p) => limparCpf(p.cpf)).filter(Boolean);
    if (new Set(cpfs).size !== cpfs.length) lista.push('Há CPF repetido no pedido.');
    if (!aceite) lista.push('Aceite o regulamento.');
    return lista;
  };

  const pagar = () => {
    const naTela = validarNaTela();
    setErros(naTela);
    if (naTela.length) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    iniciar(async () => {
      const r = await criarPedidoAcao({
        eventoId: evento.id,
        cupom: cupom?.codigo,
        aceite: true,
        participantes: participantes.map((p) => ({ ...p, cpf: limparCpf(p.cpf), camisa: p.camisa || undefined })),
      });
      if (r.ok) router.push(`/pedidos/${r.pedidoId}`);
      else {
        setErros(r.erros);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  };

  return (
    <div className="pagina">
      <div className="flex flex-col gap-1">
        {voltar}
        <span className="text-sm text-suave">Inscrevendo com a conta {emailConta}. Adicione outras pessoas no fim da página.</span>
      </div>

      {jaInscrito && (
        <div className="cartao border-ok bg-ok-fundo">
          <b>{jaInscrito.pago ? `Você já está inscrito neste evento${jaInscrito.numero ? ` (nº ${jaInscrito.numero})` : ''}.` : 'Você já tem uma inscrição aguardando o Pix neste evento.'}</b>
          {jaInscrito.pedidoId && (
            <a className="link self-start" href={`/pedidos/${jaInscrito.pedidoId}`}>{jaInscrito.pago ? 'Ver minha inscrição' : 'Ir para o pagamento'}</a>
          )}
          <span className="text-sm">Para inscrever outra pessoa, preencha os dados dela abaixo.</span>
        </div>
      )}

      {erros.length > 0 && (
        <div className="erros" role="alert">
          <b>Falta pouco:</b>
          <ul className="mt-1 list-disc pl-5">{erros.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {participantes.map((p, i) => {
        const cpfLimpo = limparCpf(p.cpf);
        const ehSocio = cpfsSocios.has(cpfLimpo);
        const repetido = cpfLimpo.length === 11 && participantes.some((q, j) => j !== i && limparCpf(q.cpf) === cpfLimpo);
        const item = calculo.itens[i];
        const id = (campo: string) => `${campo}-${i}`;
        return (
          <section key={i} className="cartao" aria-label={i === 0 && !jaInscrito ? 'Seus dados' : `Participante ${i + 1}`}>
            <div className="flex items-center justify-between">
              <h2 className="titulo-3 flex items-center gap-2">
                <span className="rounded-md bg-tinta px-2 font-display font-extrabold text-white">{i + 1}</span>
                {i === 0 && !jaInscrito ? 'Você' : `Participante ${i + 1}`}
              </h2>
              {i > 0 && (
                <button type="button" className="link text-sm" onClick={() => setParticipantes((l) => l.filter((_, j) => j !== i))}>Remover</button>
              )}
            </div>

            <div className="campo">
              <span className="rotulo">Distância</span>
              <div className="flex flex-wrap gap-2">
                {distancias.map((d) => {
                  const preco = precoParticipante(d, { precoSocioAtivo: evento.precoSocioAtivo, ehSocio, nascimento: p.nascimento, dataInscricao: hoje });
                  return (
                    <button key={d.id} type="button" className="chip" aria-pressed={p.distanciaId === d.id} onClick={() => alterar(i, 'distanciaId', d.id)}>
                      <b>{d.nome}</b>
                      <span className="num">{formatarReais(preco.valor)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {i === 0 && !editandoEu ? (
              <div className="flex flex-col gap-1 rounded-xl border border-linha bg-fundo2 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <b>{p.nome}</b>
                  <button type="button" className="link text-sm" onClick={() => setEditandoEu(true)}>Alterar</button>
                </div>
                <span>
                  CPF <span className="num">{mascararCpf(limparCpf(p.cpf))}</span> · {dataBr(p.nascimento)}
                  {NOME_SEXO[p.sexo] ? ` · ${NOME_SEXO[p.sexo]}` : ''}
                </span>
                <span className="text-suave">
                  WhatsApp {p.telefone}
                  {evento.pedeCamisa && p.camisa ? ` · Camisa ${p.camisa}` : ''}
                </span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item?.categoria && <span>Categoria: <b>{item.categoria}</b></span>}
                  {ehSocio && <span className="selo selo-ok">Sócio do clube · preço de sócio</span>}
                  {ehIdoso(p.nascimento, hoje) && <span className="selo selo-ok">60+ · paga meia</span>}
                  {cpfJaInscrito(p.cpf) && <span className="selo selo-erro">Este CPF já está inscrito neste evento</span>}
                </div>
                <span className="dica">Dados do seu cadastro. Para mudar de vez, use Meus dados.</span>
              </div>
            ) : (
            <>
            <div className="campo">
              <label htmlFor={id('cpf')}>CPF</label>
              <input id={id('cpf')} className="entrada num" inputMode="numeric" placeholder="000.000.000-00" value={p.cpf} onChange={(e) => alterar(i, 'cpf', formatarCpf(e.target.value))} />
              <div className="flex flex-wrap gap-1.5">
                {cpfLimpo.length === 11 && !validarCpf(cpfLimpo) && <span className="selo selo-erro">CPF inválido</span>}
                {ehSocio && <span className="selo selo-ok">Sócio do clube · preço de sócio</span>}
                {repetido && <span className="selo selo-erro">CPF repetido neste pedido</span>}
                {cpfJaInscrito(p.cpf) && <span className="selo selo-erro">Este CPF já está inscrito neste evento</span>}
              </div>
            </div>

            <div className="campo">
              <label htmlFor={id('nome')}>Nome completo</label>
              <input id={id('nome')} className="entrada" autoComplete={i === 0 ? 'name' : 'off'} value={p.nome} onChange={(e) => alterar(i, 'nome', e.target.value)} />
            </div>

            {i > 0 && (
              <div className="campo">
                <label htmlFor={id('email')}>E-mail do participante <span className="font-normal text-suave">(opcional)</span></label>
                <input id={id('email')} className="entrada" type="email" value={p.email} onChange={(e) => alterar(i, 'email', e.target.value)} />
                <span className="dica">Se preencher, a pessoa também recebe a confirmação.</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2.5">
              <div className="campo">
                <label htmlFor={id('nascimento')}>Nascimento</label>
                <input id={id('nascimento')} className="entrada" type="date" max={hoje} value={p.nascimento} onChange={(e) => alterar(i, 'nascimento', e.target.value)} />
              </div>
              {evento.usaCategoria && (
                <div className="campo">
                  <label htmlFor={id('sexo')}>Sexo</label>
                  <select id={id('sexo')} className="entrada" value={p.sexo} onChange={(e) => alterar(i, 'sexo', e.target.value)}>
                    <option value="">Selecione</option>
                    <option value="F">Feminino</option>
                    <option value="M">Masculino</option>
                  </select>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              {item?.categoria ? <span>Categoria: <b>{item.categoria}</b></span> : evento.usaCategoria && <span className="text-suave">A categoria aparece depois de nascimento e sexo.</span>}
              {ehIdoso(p.nascimento, hoje) && <span className="selo selo-ok">60+ · paga meia</span>}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="campo">
                <label htmlFor={id('telefone')}>WhatsApp</label>
                <input id={id('telefone')} className="entrada" inputMode="tel" autoComplete={i === 0 ? 'tel' : 'off'} value={p.telefone} onChange={(e) => alterar(i, 'telefone', mascaraTelefone(e.target.value))} />
              </div>
              {evento.pedeCamisa && (
                <div className="campo">
                  <label htmlFor={id('camisa')}>Camisa</label>
                  <select id={id('camisa')} className="entrada" value={p.camisa} onChange={(e) => alterar(i, 'camisa', e.target.value)}>
                    <option value="">Tamanho</option>
                    {TAMANHOS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="campo">
              <label htmlFor={id('emergencia')}>Contato de emergência</label>
              <input id={id('emergencia')} className="entrada" placeholder="Nome e telefone" value={p.contatoEmergencia} onChange={(e) => alterar(i, 'contatoEmergencia', e.target.value)} />
            </div>
            </>
            )}
          </section>
        );
      })}

      {participantes.length < 10 && (
        <div className="flex flex-col gap-2">
          {sugestoes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="rotulo">Quem você já inscreveu</span>
              <div className="flex flex-wrap gap-2">
                {sugestoes.map((pessoa) => (
                  <button
                    key={pessoa.cpf}
                    type="button"
                    className="botao botao-borda botao-pequeno"
                    onClick={() => setParticipantes((l) => [...l, { ...vazio(), ...pessoa, cpf: formatarCpf(pessoa.cpf), distanciaId: distanciaUnica }])}
                  >
                    + {pessoa.nome}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="button" className="botao botao-borda w-full" onClick={() => setParticipantes((l) => [...l, { ...vazio(), distanciaId: distanciaUnica }])}>
            + Adicionar outro participante
          </button>
        </div>
      )}

      <section className="cartao">
        <div className="campo">
          <label htmlFor="cupom">Cupom</label>
          <div className="flex gap-2">
            <input id="cupom" className="entrada uppercase" placeholder="Se tiver" value={cupomTxt} onChange={(e) => setCupomTxt(e.target.value)} />
            <button type="button" className="botao botao-borda botao-pequeno" onClick={aplicarCupom}>Aplicar</button>
          </div>
          {cupomMsg && <span className="dica text-erro">{cupomMsg}</span>}
          {cupom && (
            <span className="dica">
              {calculo.desconto > 0
                ? `Cupom ${cupom.codigo} aplicado.`
                : `Cupom ${cupom.codigo} válido, mas vale só para quem paga preço cheio (não acumula com sócio ou meia).`}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          {participantes.map((p, i) => {
            const d = distancias.find((x) => x.id === p.distanciaId);
            const item = calculo.itens[i];
            return (
              <div key={i} className="flex justify-between gap-2 text-sm">
                <span>
                  {p.nome || (i === 0 ? 'Você' : `Participante ${i + 1}`)} · {d?.nome ?? '—'}
                  {item?.motivo && item.motivo !== 'cupom' ? ` · ${NOME_MOTIVO[item.motivo]}` : ''}
                </span>
                <span className="num">{d ? formatarReais(item.valorSemCupom) : '—'}</span>
              </div>
            );
          })}
          {calculo.desconto > 0 && (
            <div className="flex justify-between gap-2 text-sm text-ok">
              <span>Cupom {cupom?.codigo}</span>
              <span className="num">− {formatarReais(calculo.desconto)}</span>
            </div>
          )}
          <div className="mt-1 flex items-baseline justify-between border-t border-linha pt-2.5">
            <span className="rotulo">Total</span>
            <strong className="num font-display text-[1.9rem] font-extrabold">{formatarReais(calculo.total)}</strong>
          </div>
        </div>

        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" className="mt-1 h-[18px] w-[18px] accent-acao" checked={aceite} onChange={(e) => setAceite(e.target.checked)} />
          <span>
            Li e aceito o{' '}
            {evento.regulamentoUrl ? <a className="link" href={evento.regulamentoUrl} target="_blank" rel="noreferrer">regulamento</a> : 'regulamento'} e autorizo o uso
            dos dados para esta inscrição.
          </span>
        </label>
      </section>

      <div className="fixo-baixo">
        <button type="button" className="botao botao-primario w-full" disabled={enviando} onClick={pagar}>
          {enviando ? 'Gerando Pix…' : faltaDistancia ? 'Escolha a distância para continuar' : `Pagar ${formatarReais(calculo.total)} com Pix`}
        </button>
      </div>
    </div>
  );
}

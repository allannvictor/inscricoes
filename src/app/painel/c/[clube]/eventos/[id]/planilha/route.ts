import { exigirEvento } from '@/lib/painel/acesso';
import { listarInscritos, statusVisivel } from '@/lib/painel/inscritos';
import { centavosParaPlanilha, gerarCsv } from '@/lib/painel/planilha';
import { formatarCpf } from '@/lib/regras/cpf';
import { FUSO, idadeEm, dataLocal } from '@/lib/regras/datas';
import { NOME_MOTIVO, type MotivoDesconto } from '@/lib/regras/preco';

export const dynamic = 'force-dynamic';

const dataHora = (d: Date | null) =>
  d ? new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'short', timeStyle: 'short' }).format(d) : '';
const dataBr = (iso: string) => iso.split('-').reverse().join('/');
const SITUACAO: Record<string, string> = { confirmada: 'Paga', pendente: 'Aguardando Pix', cancelada: 'Cancelada', expirada: 'Pix expirado' };

/** Planilha com todos os inscritos (abre no Excel). Só para organizadores do clube. */
export async function GET(_: Request, { params }: { params: Promise<{ clube: string; id: string }> }) {
  const { clube, id } = await params;
  const { evento } = await exigirEvento(clube, id);
  const linhas = await listarInscritos(evento.id, { status: 'todas' });
  const diaProva = dataLocal(evento.dataHora);
  const csv = gerarCsv(
    ['Nº', 'Situação', 'Nome', 'CPF', 'E-mail', 'Nascimento', 'Idade na prova', 'Sexo', 'Categoria', 'Distância', 'Camisa', 'WhatsApp', 'Contato de emergência', 'Valor pago (R$)', 'Desconto', 'Comprador (conta)', 'Transferida de', 'Inscrito em', 'Pago em'],
    linhas.map((l) => [
      l.inscricao.numero,
      SITUACAO[statusVisivel(l)] ?? statusVisivel(l),
      l.inscricao.nome,
      formatarCpf(l.inscricao.cpf),
      l.inscricao.email,
      dataBr(l.inscricao.nascimento),
      idadeEm(l.inscricao.nascimento, diaProva),
      l.inscricao.sexo === 'F' ? 'Feminino' : 'Masculino',
      l.inscricao.categoria,
      l.distancia,
      l.inscricao.camisa,
      l.inscricao.telefone,
      l.inscricao.contatoEmergencia,
      centavosParaPlanilha(l.inscricao.precoCentavos),
      l.inscricao.motivoDesconto ? NOME_MOTIVO[l.inscricao.motivoDesconto as Exclude<MotivoDesconto, null>] : '',
      l.comprador,
      l.transferidaDe,
      dataHora(l.inscricao.criadoEm),
      dataHora(l.pagoEm),
    ]),
  );
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="inscritos-${evento.slug}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}

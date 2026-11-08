/** Interface comum dos provedores de pagamento (Mercado Pago real ou simulado). */

export interface DadosPix {
  pagamentoId: string;
  copiaECola: string;
  qrBase64: string; // PNG em base64, sem o prefixo data:
}

export type StatusPagamento = 'pendente' | 'aprovado' | 'recusado' | 'cancelado';

export interface ConsultaPagamento {
  status: StatusPagamento;
  pedidoId: string | null; // external_reference
  valorCentavos: number;
  taxaCentavos: number | null;
}

export interface CriarPixEntrada {
  pedidoId: string;
  totalCentavos: number;
  descricao: string;
  expiraEm: Date;
  comprador: { email: string; nome: string; cpf: string };
}

export interface ProvedorPagamento {
  nome: 'mercadopago' | 'simulado';
  criarPix(entrada: CriarPixEntrada): Promise<DadosPix>;
  consultar(pagamentoId: string): Promise<ConsultaPagamento>;
}

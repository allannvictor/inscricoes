import 'server-only';
import QRCode from 'qrcode';
import type { ProvedorPagamento } from './tipos';

/**
 * Modo simulado: usado quando não há MP_ACCESS_TOKEN.
 * Gera um "Pix" de mentira e o pagamento é aprovado pelo botão "Simular Pix recebido".
 * O status real fica no próprio pedido (banco), por isso consultar() devolve sempre pendente.
 */
export const provedorSimulado: ProvedorPagamento = {
  nome: 'simulado',
  async criarPix(e) {
    const copiaECola = `SIMULADO-PIX-${e.pedidoId}-${(e.totalCentavos / 100).toFixed(2)}`;
    const dataUrl = await QRCode.toDataURL(copiaECola, { margin: 1, width: 300 });
    return { pagamentoId: `sim-${e.pedidoId}`, copiaECola, qrBase64: dataUrl.replace(/^data:image\/png;base64,/, '') };
  },
  async consultar() {
    return { status: 'pendente', pedidoId: null, valorCentavos: 0, taxaCentavos: null };
  },
};

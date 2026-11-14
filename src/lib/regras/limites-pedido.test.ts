import { describe, expect, it } from 'vitest';
import { bloqueioDePedido, MAX_PENDENTES_POR_CONTA, MAX_PENDENTES_POR_EVENTO, MAX_PESSOAS_PENDENTES_POR_EVENTO } from './limites-pedido';

describe('bloqueioDePedido', () => {
  it('libera abaixo dos limites', () => {
    expect(bloqueioDePedido(0, 0)).toBeNull();
    expect(bloqueioDePedido(MAX_PENDENTES_POR_EVENTO - 1, MAX_PENDENTES_POR_CONTA - 1)).toBeNull();
  });
  it('bloqueia no limite por evento e por conta', () => {
    expect(bloqueioDePedido(MAX_PENDENTES_POR_EVENTO, 0)).toMatch(/neste evento/);
    expect(bloqueioDePedido(0, MAX_PENDENTES_POR_CONTA)).toMatch(/muitos pedidos/);
  });
  it('bloqueia quando passaria de 10 pessoas aguardando Pix no evento', () => {
    expect(bloqueioDePedido(1, 1, MAX_PESSOAS_PENDENTES_POR_EVENTO)).toBeNull();
    expect(bloqueioDePedido(1, 1, MAX_PESSOAS_PENDENTES_POR_EVENTO + 1)).toMatch(/muitas pessoas/);
  });
});

import { describe, expect, it } from 'vitest';
import { ehEmailAdmin, ehOrganizadorDoClube, podeAbrirPainel, podeVerInscricao, podeVerPedido, type UsuarioLogado } from './permissoes';

const comprador: UsuarioLogado = { id: 'u1', email: 'marina@exemplo.com', cpf: '52998224725', clubesOrganizados: [] };
const outro: UsuarioLogado = { id: 'u2', email: 'outro@exemplo.com', cpf: '11144477735', clubesOrganizados: [] };
const orgA: UsuarioLogado = { id: 'u3', email: 'org@cf.com', cpf: null, clubesOrganizados: ['clubeA'] };
const orgB: UsuarioLogado = { id: 'u4', email: 'org@b.com', cpf: null, clubesOrganizados: ['clubeB'] };
const pedido = { compradorId: 'u1' };

describe('Permissões de pedido', () => {
  it('comprador vê', () => expect(podeVerPedido(comprador, pedido, 'clubeA')).toBe(true));
  it('outro usuário não vê', () => expect(podeVerPedido(outro, pedido, 'clubeA')).toBe(false));
  it('sem login não vê', () => expect(podeVerPedido(null, pedido, 'clubeA')).toBe(false));
  it('organizador do clube do evento vê', () => expect(podeVerPedido(orgA, pedido, 'clubeA')).toBe(true));
  it('organizador de outro clube não vê', () => expect(podeVerPedido(orgB, pedido, 'clubeA')).toBe(false));
});

describe('Permissões de inscrição', () => {
  const inscricao = { cpf: '11144477735', email: null };
  it('participante pelo CPF da conta vê', () => expect(podeVerInscricao(outro, inscricao, pedido, 'clubeA')).toBe(true));
  it('participante pelo e-mail vê', () =>
    expect(podeVerInscricao({ ...outro, cpf: null }, { cpf: '00000000000', email: 'OUTRO@exemplo.com' }, pedido, 'clubeA')).toBe(true));
  it('estranho não vê', () =>
    expect(podeVerInscricao({ id: 'u9', email: 'x@y.com', cpf: null, clubesOrganizados: [] }, inscricao, pedido, 'clubeA')).toBe(false));
});

describe('Painel: master e organizador', () => {
  const master: UsuarioLogado = { id: 'm', email: 'master@x.com', cpf: null, clubesOrganizados: [], admin: true };
  it('master acessa qualquer clube', () => {
    expect(ehOrganizadorDoClube(master, 'clubeA')).toBe(true);
    expect(ehOrganizadorDoClube(master, 'clubeZ')).toBe(true);
    expect(podeAbrirPainel(master)).toBe(true);
  });
  it('organizador só acessa o próprio clube', () => {
    expect(ehOrganizadorDoClube(orgA, 'clubeA')).toBe(true);
    expect(ehOrganizadorDoClube(orgA, 'clubeB')).toBe(false);
  });
  it('atleta não abre o painel', () => {
    expect(podeAbrirPainel(comprador)).toBe(false);
    expect(podeAbrirPainel(null)).toBe(false);
  });
  it('lista de e-mails master', () => {
    expect(ehEmailAdmin('Master@X.com', 'outro@x.com, master@x.com')).toBe(true);
    expect(ehEmailAdmin('master@x.com', '')).toBe(false);
    expect(ehEmailAdmin('master@x.com', undefined)).toBe(false);
  });
});

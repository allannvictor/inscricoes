import { formatarReais } from '@/lib/regras/preco';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function layout(titulo: string, corpo: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f5f6f8;font-family:Arial,Helvetica,sans-serif;color:#1b1f24">
<div style="max-width:480px;margin:0 auto;padding:24px 16px">
<div style="background:#fff;border:1px solid #e2e5e9;border-radius:12px;padding:24px">
<h1 style="font-size:20px;margin:0 0 16px">${esc(titulo)}</h1>${corpo}
</div><p style="font-size:12px;color:#5f6670;text-align:center;margin-top:16px">Você recebeu este e-mail porque usou o site de inscrições.</p>
</div></body></html>`;
}

export function emailCodigo(codigo: string) {
  return {
    assunto: `${codigo} é seu código de acesso`,
    texto: `Seu código de acesso é ${codigo}. Ele vale por 10 minutos.\nSe não foi você, ignore este e-mail.`,
    html: layout(
      'Seu código de acesso',
      `<p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:8px 0 16px">${esc(codigo)}</p>
<p style="margin:0;color:#5f6670">Vale por 10 minutos. Se não foi você, ignore este e-mail.</p>`,
    ),
  };
}

export function emailConfirmacao(args: {
  evento: string;
  data: string;
  total: number;
  participantes: Array<{ nome: string; distancia: string; numero: number | null }>;
  link: string;
}) {
  const linhas = args.participantes.map((p) => `${p.nome} · ${p.distancia}${p.numero ? ` · nº ${p.numero}` : ''}`);
  return {
    assunto: `Inscrição confirmada: ${args.evento}`,
    texto: `Pagamento de ${formatarReais(args.total)} recebido.\n${args.evento} · ${args.data}\n\n${linhas.join('\n')}\n\nVer inscrição: ${args.link}`,
    html: layout(
      'Inscrição confirmada',
      `<p style="margin:0 0 12px">Pagamento de <b>${formatarReais(args.total)}</b> recebido.</p>
<p style="margin:0 0 12px"><b>${esc(args.evento)}</b><br>${esc(args.data)}</p>
<ul style="padding-left:18px;margin:0 0 16px">${linhas.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
<a href="${esc(args.link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:bold">Ver minha inscrição</a>`,
    ),
  };
}

export function emailTransferenciaRecebida(args: { evento: string; data: string; nome: string; distancia: string; numero: number | null; link: string }) {
  return {
    assunto: `Você recebeu uma inscrição: ${args.evento}`,
    texto: `Olá, ${args.nome}! Uma inscrição foi transferida para você.\n${args.evento} · ${args.data}\n${args.distancia}${args.numero ? ` · nº ${args.numero}` : ''}\n\nVer inscrição: ${args.link}`,
    html: layout(
      'Inscrição transferida para você',
      `<p style="margin:0 0 12px">Olá, <b>${esc(args.nome)}</b>! Uma inscrição foi transferida para você.</p>
<p style="margin:0 0 12px"><b>${esc(args.evento)}</b><br>${esc(args.data)}<br>${esc(args.distancia)}${args.numero ? ` · nº ${args.numero}` : ''}</p>
<a href="${esc(args.link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:bold">Ver minha inscrição</a>`,
    ),
  };
}

export function emailTransferenciaEnviada(args: { evento: string; nomeAnterior: string; nomeNovo: string }) {
  return {
    assunto: `Inscrição transferida: ${args.evento}`,
    texto: `Olá, ${args.nomeAnterior}. A sua inscrição em ${args.evento} foi transferida para ${args.nomeNovo}. Se não reconhece esta transferência, fale com a organização.`,
    html: layout(
      'Inscrição transferida',
      `<p style="margin:0 0 12px">Olá, <b>${esc(args.nomeAnterior)}</b>. A sua inscrição em <b>${esc(args.evento)}</b> foi transferida para <b>${esc(args.nomeNovo)}</b>.</p>
<p style="margin:0;color:#5f6670">Se você não reconhece esta transferência, fale com a organização do evento.</p>`,
    ),
  };
}

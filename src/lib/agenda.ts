/**
 * Links da página do evento: mapa, agenda (.ics, funciona no iPhone, Android e Outlook) e compartilhar no WhatsApp.
 */

export function linkMapa(local: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local)}`;
}

export function linkWhatsappCompartilhar(texto: string, url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${texto}\n${url}`)}`;
}

function dataIcs(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Escape de texto no .ics (RFC 5545): barra, ponto e vírgula, vírgula e quebras de linha (\r\n, \r ou \n).
 * Antes o ";" saía sem escape e um "\r" sozinho abria uma linha nova: dava para injetar um alarme ou um link
 * no calendário de quem baixa o arquivo (oitava varredura, 14/11/2026). Outros caracteres de controle somem.
 */
export function escaparIcs(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/[\u0000-\u001f\u007f\u2028\u2029]/g, '');
}

/** Arquivo de calendário com o evento (duração estimada de 3 horas). */
export function gerarIcs(args: { id: string; nome: string; inicio: Date; local: string; url: string; agora?: Date }): string {
  const fim = new Date(args.inicio.getTime() + 3 * 60 * 60 * 1000);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Inscricoes Fast//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${args.id}@inscricoesfast`,
    `DTSTAMP:${dataIcs(args.agora ?? new Date())}`,
    `DTSTART:${dataIcs(args.inicio)}`,
    `DTEND:${dataIcs(fim)}`,
    `SUMMARY:${escaparIcs(args.nome)}`,
    `LOCATION:${escaparIcs(args.local)}`,
    `DESCRIPTION:${escaparIcs(args.url)}`,
    `URL:${args.url}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

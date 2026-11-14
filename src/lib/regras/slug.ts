/** "Simulado 10K de Dezembro!" → "simulado-10k-de-dezembro" (usado no link do evento). */
export function gerarSlug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '') || 'evento';
}

/**
 * Endereço (slug) de evento ou clube vindo da URL. Só letras minúsculas, números e hífen, até 80.
 * Um caractere nulo no endereço (`/eventos/%00/agenda.ics`) dava erro 500 no banco
 * (sétima varredura de segurança, 14/11/2026).
 */
export function ehSlug(valor: unknown): valor is string {
  return typeof valor === 'string' && /^[a-z0-9-]{1,80}$/.test(valor);
}

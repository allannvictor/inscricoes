import 'server-only';
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tipoPelosBytes } from './tipo-arquivo';

/**
 * Envio de arquivos (capa do evento, foto do clube, regulamento em PDF).
 * Com BLOB_READ_WRITE_TOKEN (Vercel Blob) os arquivos ficam na Vercel.
 * Sem ele, só em desenvolvimento, ficam em public/uploads.
 */

export const LIMITE_BYTES = 4 * 1024 * 1024; // a Vercel aceita até ~4,5 MB por envio

const TIPOS = {
  imagem: { mimes: ['image/jpeg', 'image/png', 'image/webp'], nome: 'imagem JPG, PNG ou WEBP' },
  pdf: { mimes: ['application/pdf'], nome: 'arquivo PDF' },
} as const;

const EXTENSAO: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf' };

export async function salvarArquivo(arquivo: File, tipo: keyof typeof TIPOS, pasta: string): Promise<string> {
  const regra = TIPOS[tipo];
  if (!(regra.mimes as readonly string[]).includes(arquivo.type)) throw new Error(`Envie um ${regra.nome}.`);
  if (arquivo.size > LIMITE_BYTES) throw new Error('Arquivo grande demais (máximo 4 MB).');
  // O conteúdo precisa ser mesmo do tipo declarado (o tipo vindo do navegador pode ser falsificado).
  const conteudo = Buffer.from(await arquivo.arrayBuffer());
  if (tipoPelosBytes(conteudo) !== arquivo.type) throw new Error(`Envie um ${regra.nome}.`);
  const nome = `${pasta}/${Date.now()}-${randomBytes(4).toString('hex')}.${EXTENSAO[arquivo.type]}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import('@vercel/blob');
    const r = await put(nome, conteudo, { access: 'public', contentType: arquivo.type });
    return r.url;
  }
  if (process.env.NODE_ENV === 'production') throw new Error('Envio de arquivos não configurado (falta BLOB_READ_WRITE_TOKEN).');
  const destino = path.join(process.cwd(), 'public', 'uploads', nome);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, conteudo);
  return `/uploads/${nome}`;
}

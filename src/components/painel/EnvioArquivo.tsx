'use client';

/* eslint-disable @next/next/no-img-element */
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

type Acao = (formulario: FormData) => Promise<{ ok: true; url: string } | { ok: false; erros: string[] }>;

/** Reduz a imagem no navegador (lado maior até `maxLado`, JPEG) para o envio ficar leve e rápido. */
async function reduzirImagem(arquivo: File, maxLado: number): Promise<File> {
  if (!arquivo.type.startsWith('image/')) return arquivo;
  const bitmap = await createImageBitmap(arquivo).catch(() => null);
  if (!bitmap) return arquivo;
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob ? new File([blob], 'imagem.jpg', { type: 'image/jpeg' }) : arquivo;
}

export function EnvioArquivo(props: {
  id: string;
  rotulo: string;
  tipo: 'imagem' | 'pdf';
  atual: string | null;
  dica: string;
  enviar: Acao;
  remover?: () => Promise<unknown>;
  previa?: 'capa' | 'redonda';
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();

  const escolher = (arquivo: File | undefined) => {
    if (!arquivo) return;
    iniciar(async () => {
      setErro(null);
      const final = props.tipo === 'imagem' ? await reduzirImagem(arquivo, props.previa === 'redonda' ? 600 : 1600) : arquivo;
      const dados = new FormData();
      dados.set('arquivo', final);
      const r = await props.enviar(dados);
      if (!r.ok) setErro(r.erros.join(' '));
      else router.refresh();
      if (input.current) input.current.value = '';
    });
  };

  return (
    <div className="campo">
      <span className="rotulo-campo">{props.rotulo}</span>
      <div className="flex flex-wrap items-center gap-3">
        {props.previa === 'capa' && (
          <div className="capa w-[240px]">{props.atual ? <img src={props.atual} alt="" /> : <span className="grid h-full place-items-center text-sm text-suave">Sem imagem</span>}</div>
        )}
        {props.previa === 'redonda' && (
          <div className="avatar h-24 w-24 text-3xl">{props.atual ? <img src={props.atual} alt="" /> : '—'}</div>
        )}
        {props.tipo === 'pdf' && props.atual && (
          <a className="link text-sm" href={props.atual} target="_blank" rel="noreferrer">Ver regulamento atual</a>
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <label htmlFor={props.id} className="botao botao-borda botao-pequeno cursor-pointer">
              {ocupado ? 'Enviando…' : props.atual ? 'Trocar' : 'Enviar'}
            </label>
            {props.atual && props.remover && (
              <button type="button" className="botao botao-borda botao-pequeno" disabled={ocupado} onClick={() => iniciar(async () => { await props.remover!(); router.refresh(); })}>
                Remover
              </button>
            )}
          </div>
          <input
            ref={input}
            id={props.id}
            type="file"
            className="sr-only"
            accept={props.tipo === 'imagem' ? 'image/jpeg,image/png,image/webp' : 'application/pdf'}
            disabled={ocupado}
            onChange={(e) => escolher(e.target.files?.[0])}
          />
          <span className="dica max-w-md">{props.dica}</span>
        </div>
      </div>
      {erro && <p className="erros" role="alert">{erro}</p>}
    </div>
  );
}

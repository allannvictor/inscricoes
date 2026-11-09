import type { Metadata, Viewport } from 'next';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import '@fontsource/public-sans/400.css';
import '@fontsource/public-sans/600.css';
import '@fontsource/public-sans/700.css';
import './globals.css';
import { Cabecalho } from '@/components/Cabecalho';
import { ehHomologacao } from '@/lib/ambiente';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
  title: { default: 'Inscrições', template: '%s · Inscrições' },
  description: 'Inscrições para simulados e provas de corrida.',
};

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {ehHomologacao() && (
          <div className="bg-alerta-fundo px-4 py-2 text-center text-sm font-semibold text-alerta" role="note">
            Ambiente de teste (homologação): pagamentos simulados, nada é cobrado. Os dados podem ser apagados.
          </div>
        )}
        <Cabecalho />
        <main>{children}</main>
      </body>
    </html>
  );
}

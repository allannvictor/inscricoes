import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Envio de capa, foto e regulamento pelo painel (o navegador já reduz as imagens antes de enviar).
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;

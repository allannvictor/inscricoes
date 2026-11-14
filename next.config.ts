import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Cabeçalhos de segurança em todas as páginas (varredura de 14/11/2026):
  // - o site não pode ser carregado dentro de outro site (clickjacking);
  // - o navegador não "adivinha" o tipo de arquivo;
  // - links para fora não levam o endereço completo da página (que pode ter ids de pedido).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  experimental: {
    // Envio de capa, foto e regulamento pelo painel (o navegador já reduz as imagens antes de enviar).
    serverActions: { bodySizeLimit: '5mb' },
  },
};

export default nextConfig;

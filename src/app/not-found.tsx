import Link from 'next/link';

export default function NaoEncontrado() {
  return (
    <div className="pagina">
      <div className="cartao">
        <h1 className="titulo-2">Página não encontrada</h1>
        <p className="text-suave">O link pode estar errado, ou você não tem acesso a esta página com a conta atual.</p>
        <Link href="/" className="botao botao-borda self-start">Ver eventos</Link>
      </div>
    </div>
  );
}

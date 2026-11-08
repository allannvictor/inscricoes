/** Regras de CPF. Guardamos sempre só os 11 dígitos. */

export function limparCpf(valor: string): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** Confere os dois dígitos verificadores. Rejeita sequências repetidas (111.111.111-11). */
export function validarCpf(valor: string): boolean {
  const cpf = limparCpf(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(cpf.slice(0, 9), 10);
  const d2 = digito(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

export function formatarCpf(valor: string): string {
  const d = limparCpf(valor).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

/** Para mostrar fora do painel: ***.456.789-** */
export function mascararCpf(valor: string): string {
  const d = limparCpf(valor);
  if (d.length !== 11) return '***';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

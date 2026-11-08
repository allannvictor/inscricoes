/**
 * Envio de e-mail pelo Resend. Sem RESEND_API_KEY (desenvolvimento), o e-mail aparece no terminal.
 */
export interface Email {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

export async function enviarEmail(email: Email): Promise<void> {
  const chave = process.env.RESEND_API_KEY;
  if (!chave) {
    console.log(`\n✉️  [e-mail simulado] Para: ${email.para}\n   Assunto: ${email.assunto}\n${email.texto.replace(/^/gm, '   ')}\n`);
    return;
  }
  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Inscrições <onboarding@resend.dev>',
      to: [email.para],
      subject: email.assunto,
      html: email.html,
      text: email.texto,
    }),
  });
  if (!resposta.ok) {
    console.error('Falha ao enviar e-mail', resposta.status, await resposta.text());
    throw new Error('Não foi possível enviar o e-mail agora.');
  }
}

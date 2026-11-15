# Guia: configurar o "Entrar com Google"

Passo a passo para o Allan, feito pela tela. Nenhum valor secreto vai para o chat: tudo vai direto na Vercel.

> **Situação (15/11/2026):** ainda **não configurado**. O Allan parou no **Passo 1** (criar o projeto no Google Cloud).
> O código já está pronto desde a etapa 6: o botão aparece sozinho quando `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` existem.

## Passo 1: criar o projeto no Google Cloud
1. Abra **https://console.cloud.google.com** e entre com a conta Google. Na primeira vez, aceite os termos (país: Brasil).
2. No topo, ao lado do logo "Google Cloud", clique no seletor de projeto → **"Novo projeto"**.
3. **Nome do projeto:** `Inscricoes Fast`. Deixe a organização como "Sem organização".
4. Clique em **"Criar"**. Depois, confira no topo que o projeto **"Inscricoes Fast"** está selecionado.

## Passo 2: tela de consentimento (o que o atleta vê)
1. No menu (☰), abra **"APIs e serviços" → "Tela de consentimento OAuth"**. Em algumas contas, o nome é **"Google Auth Platform"**.
2. Clique em **Começar** ou **Configurar** e preencha:
   - **Nome do app:** `Inscrições Fast`;
   - **E-mail de suporte:** o do projeto, se existir (ex.: `contato@inscricoesfast.com.br`), ou o do Allan por enquanto;
   - **Público:** **Externo**;
   - **E-mail de contato:** o mesmo.
3. Enquanto o app estiver **"em teste"**, só os e-mails cadastrados em **"usuários de teste"** conseguem entrar com Google. Cadastre o e-mail do Allan. Antes de abrir ao público, é preciso **publicar** o app.

## Passo 3: criar a credencial (ID do cliente)
1. Em **"APIs e serviços" → "Credenciais" → "+ Criar credenciais" → "ID do cliente OAuth"**:
   - **Tipo de aplicativo:** **Aplicativo da Web**;
   - **Nome:** `Inscricoes Fast hml`;
   - **URIs de redirecionamento autorizados:** `https://hml.inscricoesfast.com.br/api/auth/google/callback`.
   - Quando for para a produção, adicione também `https://www.inscricoesfast.com.br/api/auth/google/callback`.
2. Clique em **Criar**. Aparecem o **ID do cliente** (termina em `.apps.googleusercontent.com`) e a **Chave secreta do cliente**.

## Passo 4: colar na Vercel (só Preview, por enquanto)
Em **Vercel → projeto inscricoes → Settings → Environment Variables**, marque **só "Preview"** e adicione:

| Key | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | o ID do cliente |
| `GOOGLE_CLIENT_SECRET` | a chave secreta (pode marcar "Sensitive") |

Depois, em **Deployments**, faça **Redeploy** do deploy mais recente do `staging`.

## Passo 5: conferir
1. Abra `https://hml.inscricoesfast.com.br/entrar`: deve aparecer **"Entrar com Google"**.
2. Entre com o e-mail cadastrado como usuário de teste. Se a conta já existe com esse e-mail, ela é ligada ao Google e chega um e-mail de aviso.

## Migrar para a empresa no futuro
Veja `docs/guias/migrar-para-cnpj.md`. As credenciais são do **projeto**, não da conta pessoal: trocar o dono do projeto não muda nada para os atletas.

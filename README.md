# Minhas Artes - Galeria de Arte
VERSÃO 1.0 LTS

## Sistema de galeria de arte com cadastro de usuários, obras, galerias de imagens e funcionalidades de IA com Google Gemini.

## ✨ Funcionalidades Principais

-   **Galeria Pública e Pessoal**: Explore obras de todos os artistas ou gerencie sua própria coleção particular.
-   **Perfis de Artista**: Cada artista tem uma página pública para exibir seu portfólio e biografia.
-   **Sistema de Aprovação de Usuários**: Novos usuários são bloqueados por padrão e precisam de aprovação do admin, garantindo uma comunidade segura e qualificada.
-   **Sistema de Doação**: Permite que os usuários apoiem a plataforma através de doações via PIX, com chave configurável pelo administrador.

### Funcionalidades com IA (Google Gemini)

A plataforma conta com ferramentas de inteligência artificial para auxiliar os artistas, utilizando a API do Google Gemini. Para usar essas funcionalidades, **cada usuário precisa fornecer sua própria chave de API**.

-   **Analisador de Obras**: Envie uma imagem da sua arte e receba uma análise detalhada sobre título, descrição, estilo e feedback construtivo.
-   **Tutor de Arte**: Converse com um tutor de IA para tirar dúvidas, pedir dicas sobre técnicas, materiais ou inspiração.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `user` (Perfis de Usuário)
- `id` (text, PK) - Sincronizado com auth.users.id
- `nome`, `descricao`, `foto`
- `admin` (boolean) - Flag de administrador
- `bloc` (boolean) - **Flag de bloqueio (padrão: true)** - Novos usuários requerem aprovação

#### `obras` (Obras de Arte)
- `id` (bigint, PK)
- `user_id` (text, FK → user.id) - Artista
- `titulo`, `data_criacao`, `img`, `video`, `nome_dono`, `foto_dono`

#### `imgs` (Galeria de Imagens)
- `id` (bigint, PK)
- `obras_id` (bigint, FK → obras.id)
- `url` (text) - Caminho da imagem no Storage

#### `obra_analysis` (Análise de Obras com IA)
- `user_id` (uuid, FK → auth.users.id)
- `image_url`, `suggested_title`, `description`, `style_classification`, `constructive_feedback`

#### `user_api_keys` (Chaves de API dos Usuários)
- `user_id` (uuid, PK, FK -> auth.users.id)
- `api_key` (text) - Chave da API do Gemini do usuário (texto plano)

#### `chat_sessions` e `chat_messages` (Tutor de Arte)
- Armazenam o histórico das conversas de cada usuário com o tutor de IA.

#### `settings` (Configurações do Admin)
- `key` (text, PK)
- `value` (text) - Armazena configurações globais como prompts do sistema para a IA, **chave PIX para doações** e WhatsApp do admin.

## 🚀 Configuração Inicial

### ⚠️ IMPORTANTE: Sistema de Aprovação de Usuários

**Novos usuários são bloqueados por padrão** e precisam de aprovação do admin.

📖 **Guia completo**: [docs/USER_APPROVAL_SYSTEM.md](./docs/USER_APPROVAL_SYSTEM.md)

**Configuração rápida**:

1.  Acesse a página de **Configurações de Administrador** (`/admin/settings`).
2.  Configure o **WhatsApp do Administrador** no formato internacional (ex: `+5511999999999`).
3.  Configure a **Chave PIX** para habilitar o sistema de doações.

4.  Execute a migration no Supabase SQL Editor:
    ```sql
    -- Cole: supabase/migrations/20260112_set_default_blocked.sql
    ```

---

### ⚠️ IMPORTANTE: Correção de Autenticação

Se você adicionou colunas `email` e `senha` na tabela `user`, **remova-as imediatamente**. O Supabase já gerencia isso de forma segura.

📖 Leia mais: [docs/AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)

---

### 1. Aplicar Migrations

Execute os scripts SQL no Supabase SQL Editor para criar a estrutura do banco de dados.

### 2. Configurar Storage Bucket

Crie o bucket `art_gallery` no Supabase Storage e configure-o como **público**.

### 3. Configurações do Admin (Obrigatório para IA)

- Acesse a página `/admin/settings`.
- Configure o **Nome do Modelo Gemini** (recomendado: `gemini-pro` ou `gemini-pro-vision`).
- Defina o **Prompt do Sistema** para o Tutor de Arte.

### 4. Instalar Dependências e Executar

```bash
npm install
npm run dev
```

## 📝 Fluxos de Uso

### Análise de Obras com IA
1. Usuário acessa `/settings/api` e salva sua chave da API do Google Gemini.
2. Acessa a página `/analyzer`.
3. Faz o upload de uma imagem.
4. A plataforma usa a chave do usuário para chamar a Edge Function `analyze-with-gemini`.
5. A função processa a imagem com o Gemini e retorna a análise.
6. O resultado é exibido na tela e salvo no histórico.

### Tutor de Arte com IA
1. Usuário (com chave de API configurada) acessa `/tutor`.
2. Inicia uma nova conversa ou seleciona uma do histórico.
3. Envia uma mensagem.
4. A Edge Function `gemini-chat` usa a chave do usuário e o prompt do sistema (definido pelo admin) para gerar uma resposta.
5. A conversa é salva e exibida.

### Doação para a Plataforma
1. Admin configura a chave PIX em `/admin/settings`.
2. Usuário clica no botão "Apoie a Plataforma" na página inicial.
3. É redirecionado para a página `/donate`.
4. Copia a chave PIX, realiza a doação e envia o comprovante pelo WhatsApp do admin.

### Cadastro e Aprovação de Novo Usuário
- Novos usuários são bloqueados e redirecionados para `/welcome`, onde podem solicitar aprovação via WhatsApp.

### Recuperação de Senha
- Fluxo seguro de recuperação via email, com atualização de senha na própria plataforma.

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (Auth + Database + Storage + Edge Functions)
- **IA**: Google Gemini
- **UI**: Tailwind CSS + shadcn/ui
- **Estado**: React Query (TanStack Query)
- **Formulários**: React Hook Form + Zod

## 📦 Estrutura do Projeto

```
minhas_artes/
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── ArtworkAnalyzerPage.tsx # Analisador de Obras
│   │   ├── ArtTutorPage.tsx        # Tutor de Arte
│   │   ├── ApiSettingsPage.tsx     # Configuração de API do usuário
│   │   ├── AdminSettingsPage.tsx   # Configurações do admin
│   │   ├── DonationPage.tsx        # Página de Doação
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/
│   │       ├── api.ts
│   │       └── client.ts
│   └── types/
├── supabase/
│   ├── migrations/
│   └── functions/
│       ├── analyze-with-gemini/ # Análise de imagem com Gemini
│       ├── gemini-chat/         # Chat com Gemini
│       ├── save-user-api-key/   # Salva chave de API
│       └── ...
└── ...
```

## 🐛 Troubleshooting

### Erro "404 Not Found" com modelo Gemini
**Causa**: O modelo configurado (ex: `gemini-1.5-flash`) pode não estar disponível para sua chave de API ou região.
**Solução**:
1.  Acesse a página de configurações do admin (`/admin/settings`).
2.  Altere o **Nome do Modelo Gemini** para `gemini-pro` ou `gemini-pro-vision`.
3.  Salve as alterações. Isso deve resolver o problema imediatamente.

### Erro "Auth session missing" na recuperação de senha
**Problema resolvido!** Se ocorrer, gere um novo link de recuperação e aguarde o spinner desaparecer antes de digitar a nova senha.

### Usuário não consegue acessar funcionalidades após cadastro
**Comportamento esperado!** Novos usuários precisam de aprovação. Veja o guia [docs/USER_APPROVAL_SYSTEM.md](./docs/USER_APPROVAL_SYSTEM.md).

## 🎉 Correções e Implementações Recentes

### v1.5.0 - Sistema de Doação (2026-01-13)

✅ **Nova funcionalidade**: Adicionada página de doação para apoiar a plataforma.
- Admin pode configurar chave PIX e WhatsApp nas configurações.
- Usuários podem copiar a chave e enviar comprovantes facilmente.

### v1.4.0 - Correção do Modelo Gemini (2026-01-13)

✅ **Problema resolvido**: Erro 500 (`404 Not Found`) ao chamar a API do Gemini.
- Modelo de fallback alterado para `gemini-pro` para maior estabilidade.

### v1.3.0 - Correção da Persistência de Análise de Obras com IA (2026-01-13)

✅ **Problema resolvido**: Campos da análise de imagens não estavam sendo persistidos no banco de dados.

### v1.2.0 - Sistema de Aprovação de Usuários (2026-01-12)

✅ **Nova funcionalidade**: Novos usuários precisam de aprovação do admin.

### v1.1.0 - Correção de Recuperação de Senha (2026-01-12)

✅ **Problema resolvido**: Erro "Auth session missing" ao tentar atualizar senha via link de recuperação.
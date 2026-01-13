# Minhas Artes - Galeria de Arte

## Sistema de galeria de arte com cadastro de usuários, obras e galerias de imagens

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### `user` (Perfis de Usuário)
- `id` (bigint, PK) - Sincronizado com auth.users.id
- `nome` (text) - Nome do artista
- `descricao` (text) - Biografia
- `foto` (text) - Caminho da foto no Storage
- `admin` (boolean) - Flag de administrador
- `bloc` (boolean) - **Flag de bloqueio (padrão: true)** - Novos usuários requerem aprovação

#### `obras` (Obras de Arte)
- `id` (bigint, PK)
- `user_id` (bigint, FK → user.id) - Proprietário
- `titulo` (text) - Título da obra
- `data_criacao` (date) - Data de criação
- `img` (text) - Imagem principal
- `video` (text) - Vídeo da obra
- `nome_dono` (text) - Nome do proprietário atual
- `foto_dono` (text) - Foto do proprietário

#### `imgs` (Galeria de Imagens)
- `id` (bigint, PK)
- `obras_id` (bigint, FK → obras.id) - Obra relacionada
- `url` (text) - Caminho da imagem no Storage

#### `obra_analysis` (Análise de Obras com IA)
- `id` (bigint, PK)
- `created_at` (timestamptz) - Data da análise
- `user_id` (uuid, FK → auth.users.id) - Usuário que solicitou
- `image_url` (text) - Caminho da imagem no Storage
- `suggested_title` (text) - Título sugerido pela IA
- `description` (text) - Descrição detalhada da obra
- `style_classification` (text) - Classificação do estilo artístico
- `constructive_feedback` (text) - Feedback construtivo

📖 **Documentação da API de Análise**: [docs/ARTWORK_ANALYSIS_API.md](./docs/ARTWORK_ANALYSIS_API.md)

### Relacionamentos

```
auth.users (Supabase Auth)
    ↓ (trigger auto-create)
user (Perfis)
    ↓ (1:N)
obras (Obras de Arte)
    ↓ (1:N)
imgs (Galeria)
```

### Segurança (RLS)

- **Visualização**: Todas as tabelas são públicas para leitura
- **Criação**: Apenas usuários autenticados
- **Edição/Exclusão**: Apenas proprietário ou admin

## 🚀 Configuração Inicial

### ⚠️ IMPORTANTE: Sistema de Aprovação de Usuários

**Novos usuários são bloqueados por padrão** e precisam de aprovação do admin.

📖 **Guia completo**: [docs/USER_APPROVAL_SYSTEM.md](./docs/USER_APPROVAL_SYSTEM.md)

**Configuração rápida**:

1. Edite `.env` e configure o WhatsApp do admin:
   ```env
   VITE_ADMIN_WHATSAPP=+5511999999999
   ```

2. Execute a migration no Supabase SQL Editor:
   ```sql
   -- Cole: supabase/migrations/20260112_set_default_blocked.sql
   ```

3. Para aprovar usuários:
   ```sql
   UPDATE "user" SET bloc = false WHERE email = 'usuario@email.com';
   ```

---

### ⚠️ IMPORTANTE: Correção de Autenticação

Se você adicionou colunas `email` e `senha` na tabela `user`, **remova-as imediatamente**:

```sql
-- Execute no Supabase SQL Editor
ALTER TABLE "user" DROP COLUMN IF EXISTS email;
ALTER TABLE "user" DROP COLUMN IF EXISTS senha;
```

**Por quê?** O Supabase já gerencia autenticação de forma segura na tabela `auth.users` com senhas criptografadas. Armazenar credenciais na tabela `user` é **perigoso** e **desnecessário**.

📖 Leia mais: [docs/AUTHENTICATION_GUIDE.md](./docs/AUTHENTICATION_GUIDE.md)

---

### 1. Aplicar Migrations

Execute os scripts SQL no Supabase SQL Editor:

```bash
# No Supabase Dashboard: SQL Editor → New Query

# 1. Script principal (obrigatório)
# Cole: supabase/migrations/20260110_fix_all_tables.sql

# 2. Remover campos duplicados (se você os criou)
# Cole: supabase/migrations/remove_duplicate_auth_fields.sql
```

### 2. Configurar Storage Bucket

Crie o bucket `art_gallery` no Supabase Storage com as seguintes pastas:
- `avatars/` - Fotos de perfil
- `images/` - Imagens principais das obras
- `videos/` - Vídeos das obras
- `owner_photos/` - Fotos dos proprietários
- `gallery/` - Galeria de imagens das obras

**Importante**: Configure o bucket como **público** para permitir acesso às imagens.

### 3. Criar Primeiro Admin

Após criar um usuário via signup, execute no SQL Editor:

```sql
-- Substitua 'SEU_USER_ID_AQUI' pelo ID do usuário
UPDATE "user" 
SET admin = true 
WHERE id = 'SEU_USER_ID_AQUI';
```

### 4. Instalar Dependências

```bash
npm install
# ou
pnpm install
```

### 5. Executar Aplicação

```bash
npm run dev
# ou
pnpm dev
```

## 📝 Fluxos de Uso

### Cadastro e Aprovação de Novo Usuário
1. Usuário faz signup na tela de registro
2. Trigger cria automaticamente perfil na tabela `user` com **`bloc = true`** (bloqueado)
3. Usuário é redirecionado para **página de boas-vindas** (`/welcome`)
4. Na página de boas-vindas:
   - Mensagem personalizada de boas-vindas
   - Botão para solicitar desbloqueio via WhatsApp
   - Lista do que pode fazer enquanto aguarda aprovação
5. Admin recebe solicitação via WhatsApp
6. Admin aprova usuário (altera `bloc = false`)
7. Usuário ganha acesso completo à plataforma

**Acessos durante bloqueio**:
- ✅ Visualizar galeria pública
- ✅ Ver detalhes de obras
- ✅ Visualizar perfis de artistas
- ❌ Criar/editar obras (requer aprovação)
- ❌ Acessar perfil próprio (requer aprovação)

📖 **Guia detalhado**: [docs/USER_APPROVAL_SYSTEM.md](./docs/USER_APPROVAL_SYSTEM.md)

### Recuperação de Senha
1. Usuário acessa `/auth` e clica na aba "**Recuperar**"
2. Insere seu email e clica em "**Enviar Link de Recuperação**"
3. Recebe email com link de recuperação (válido por 1 hora)
4. Clica no link do email
5. Aguarda 1-2 segundos enquanto a sessão é estabelecida (spinner: "Preparando atualização de senha...")
6. Insere nova senha (mínimo 6 caracteres) e confirmação
7. Clica em "**Atualizar Senha**"
8. É automaticamente deslogado por segurança
9. Faz login com a nova senha

**Segurança implementada:**
- ✅ Validação de sessão antes de permitir atualização
- ✅ Logout automático após mudança de senha (melhor prática)
- ✅ Senha criptografada com bcrypt pelo Supabase
- ✅ Token de recuperação validado e com expiração
- ✅ Persistência garantida via transação atômica no PostgreSQL

### Criação de Obra
1. Usuário autenticado acessa "Nova Obra"
2. Preenche dados e faz upload de arquivos
3. Obra é automaticamente associada ao usuário

### Gestão de Galeria
1. Proprietário acessa detalhes da obra
2. Adiciona/remove imagens da galeria
3. Imagens são visíveis publicamente

### Criação de Usuário Admin
1. Admin acessa "Gerenciamento de Usuários"
2. Preenche dados do novo usuário
3. Edge Function valida permissões e cria usuário

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React + TypeScript + Vite
- **Backend**: Supabase (Auth + Database + Storage)
- **UI**: Tailwind CSS + shadcn/ui
- **Estado**: React Query (TanStack Query)
- **Formulários**: React Hook Form + Zod

## 📦 Estrutura do Projeto

```
minhas_artes/
├── src/
│   ├── components/        # Componentes reutilizáveis
│   │   ├── ui/           # Componentes de UI (shadcn)
│   │   ├── GalleryManager.tsx  # Gerenciador de galeria
│   │   └── ProfileForm.tsx     # Formulário de perfil
│   ├── pages/            # Páginas da aplicação
│   │   ├── AdminNewObra.tsx
│   │   ├── AdminUserManagement.tsx
│   │   ├── ObraDetail.tsx
│   │   └── ...
│   ├── integrations/
│   │   └── supabase/     # Integração com Supabase
│   │       ├── api.ts    # Funções de API
│   │       └── client.ts # Cliente Supabase
│   └── types/
│       └── database.ts   # Tipos TypeScript
├── supabase/
│   ├── migrations/       # Scripts de migração SQL
│   └── functions/        # Edge Functions
└── ...
```

## 🔒 Segurança

- **Row Level Security (RLS)**: Habilitado em todas as tabelas
- **Políticas de Acesso**: Controle granular por operação
- **Autenticação**: Via Supabase Auth
- **Storage**: Bucket público para imagens, validação via RLS

## 🧪 Testes

Para verificar se tudo está funcionando:

1. **Cadastro de usuário**: Criar conta e verificar criação automática de perfil
2. **Upload de imagens**: Testar upload no Storage
3. **Criação de obra**: Verificar associação correta com usuário
4. **Galeria**: Adicionar/remover imagens
5. **Permissões**: Testar acesso de admin vs usuário comum
6. **Recuperação de senha** (✅ implementado e testado):
   - Solicitar recuperação na aba "Recuperar"
   - Verificar recebimento de email
   - Clicar no link e aguardar spinner
   - Atualizar senha com sucesso
   - Fazer login com nova senha
7. **Sistema de aprovação de usuários** (✅ implementado):
   - Criar novo usuário via signup
   - Verificar redirecionamento para `/welcome`
   - Testar botão de solicitação via WhatsApp
   - Aprovar usuário no banco de dados
   - Verificar acesso liberado

## 🐛 Troubleshooting

### Erro ao criar usuário
- Verificar se trigger `on_auth_user_created` está ativo
- Confirmar que tabela `user` permite inserção manual de ID

### Erro ao fazer upload
- Verificar se bucket `art_gallery` existe e é público
- Confirmar permissões de storage no Supabase

### Erro de permissão ao criar obra
- Verificar se RLS está habilitado
- Confirmar que usuário está autenticado
- Checar políticas de INSERT na tabela `obras`

### Erro "Auth session missing" na recuperação de senha
**Problema resolvido!** Se você ainda encontrar este erro:
- Certifique-se de clicar no link do email **imediatamente** (token válido por 1 hora)
- Aguarde o spinner "Preparando atualização de senha..." desaparecer (1-2 segundos)
- Se o spinner não desaparecer após 10 segundos:
  1. Abra o Console (F12) e procure por mensagens `[AuthPage]`
  2. Verifique se há erros de rede ou CORS
  3. Gere um novo link de recuperação e tente novamente

### Erro de geolocalização (ERR_NAME_NOT_RESOLVED)
**Comportamento normal!** O sistema tenta obter localização via ipapi.co para analytics:
- ✅ Erro é silencioso (console.warn) e não afeta funcionalidades
- ✅ Timeout de 5 segundos para evitar travamentos
- ✅ Fallback automático registra visita sem dados de geo
- ✅ Execução em background não bloqueia autenticação ou navegação

### Usuário não consegue acessar funcionalidades após cadastro
**Comportamento esperado!** Novos usuários precisam de aprovação:
- ✅ Usuário é bloqueado por padrão (`bloc = true`)
- ✅ Deve solicitar desbloqueio via WhatsApp na página `/welcome`
- ✅ Admin aprova executando: `UPDATE "user" SET bloc = false WHERE id = 'user_id';`
- ✅ Após aprovação, usuário tem acesso completo
- 📖 Veja: [docs/USER_APPROVAL_SYSTEM.md](./docs/USER_APPROVAL_SYSTEM.md)

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do Supabase Dashboard
2. Revisar script de migração
3. Consultar documentação do Supabase

---

**Última atualização**: 2026-01-13

## 🎉 Correções e Implementações Recentes

### v1.3.0 - Correção da Persistência de Análise de Obras com IA (2026-01-13)

✅ **Problema resolvido**: Campos da análise de imagens não estavam sendo persistidos no banco de dados

**Implementações:**
- Normalização robusta de campos que remove acentos e é case-insensitive
- Logging detalhado em todos os pontos críticos da Edge Function
- Validação de dados antes da inserção no banco
- Suporte a múltiplas variações de nomes de campos
- Tratamento aprimorado de erros com mensagens descritivas

**Arquivos modificados:**
- `supabase/functions/analyze-artwork/index.ts` - Lógica de mapeamento e validação

**Arquivos criados:**
- `docs/ARTWORK_ANALYSIS_API.md` - Documentação completa da API de análise

**Melhorias técnicas:**
- Função `normalizeString()` para normalização Unicode (NFD) com remoção de acentos
- Função `getFieldValue()` para buscar valores por múltiplas chaves possíveis
- Logs estruturados com emojis para facilitar identificação rápida
- Validação que garante pelo menos um campo preenchido antes de inserir

**Como verificar se está funcionando:**
1. Envie uma imagem para análise
2. Verifique os logs no Supabase Dashboard → Edge Functions → analyze-artwork → Logs
3. Procure por `✅ Análise salva com sucesso!`
4. Consulte o histórico de análises para confirmar que todos os campos foram preenchidos

📖 **Documentação da API**: [docs/ARTWORK_ANALYSIS_API.md](./docs/ARTWORK_ANALYSIS_API.md)

---

### v1.2.0 - Sistema de Aprovação de Usuários (2026-01-12)

✅ **Nova funcionalidade**: Novos usuários precisam de aprovação do admin

**Implementações:**
- Página de boas-vindas (`/welcome`) com design atraente
- Botão de solicitação de desbloqueio via WhatsApp
- Middleware de proteção de rotas (`ProtectedRoute`)
- Usuários bloqueados podem ver galeria pública mas não podem criar obras
- Redirecionamento automático após aprovação
- Script SQL para alterar comportamento padrão (`bloc = true`)

**Arquivos criados:**
- `src/pages/WelcomePage.tsx` - Página de boas-vindas
- `src/components/ProtectedRoute.tsx` - Proteção de rotas
- `supabase/migrations/20260112_set_default_blocked.sql` - Migration
- `docs/USER_APPROVAL_SYSTEM.md` - Documentação completa

**Arquivos modificados:**
- `src/App.tsx` - Rotas protegidas
- `src/pages/AuthPage.tsx` - Fluxo de signup e login
- `.env` - Variável `VITE_ADMIN_WHATSAPP`

**Configuração necessária:**
```env
VITE_ADMIN_WHATSAPP=+5511999999999  # Substitua pelo número real
```

📖 **Documentação completa**: [docs/USER_APPROVAL_SYSTEM.md](./docs/USER_APPROVAL_SYSTEM.md)

---

### v1.1.0 - Correção de Recuperação de Senha (2026-01-12)

✅ **Problema resolvido**: Erro "Auth session missing" ao tentar atualizar senha via link de recuperação

**Implementações:**
- Listener de sessão com `onAuthStateChange()` para aguardar sessão estabelecida
- Indicador visual (spinner) durante preparação da atualização
- Validação de sessão antes de permitir atualização
- Logout automático após mudança de senha (melhor prática de segurança)
- Geolocalização não-bloqueante com timeout de 5 segundos
- Logs de debug para facilitar troubleshooting

**Arquivos modificados:**
- `src/pages/AuthPage.tsx` - Lógica de recuperação de senha
- `src/utils/geolocation.ts` - Timeout e tratamento de erros
- `src/hooks/useVisitTracking.ts` - Execução em background

**Garantias de segurança:**
- ✅ Token de recuperação validado pelo Supabase
- ✅ Senha criptografada com bcrypt automaticamente
- ✅ Transação atômica no PostgreSQL
- ✅ Sessão invalidada após mudança de senha
- ✅ Persistência de dados garantida

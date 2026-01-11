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
- `bloc` (boolean) - Flag de bloqueio

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

### Cadastro de Novo Usuário
1. Usuário faz signup na tela de registro
2. Trigger cria automaticamente perfil na tabela `user`
3. Usuário pode editar perfil após login

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

## 📞 Suporte

Para dúvidas ou problemas:
1. Verificar logs do Supabase Dashboard
2. Revisar script de migração
3. Consultar documentação do Supabase

---

**Última atualização**: 2026-01-10

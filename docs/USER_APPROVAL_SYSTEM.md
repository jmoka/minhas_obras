# Sistema de Aprovação de Usuários

## 📋 Visão Geral

Sistema implementado para garantir que todos os novos usuários sejam aprovados pelo administrador antes de ter acesso completo à plataforma.

## 🔄 Fluxo de Cadastro e Aprovação

### 1. Cadastro do Novo Usuário

```
Usuário preenche formulário de cadastro
    ↓
Conta é criada no Supabase Auth
    ↓
Trigger cria perfil com bloc = true (bloqueado por padrão)
    ↓
Usuário é automaticamente logado
    ↓
Redirecionado para /welcome
```

### 2. Página de Boas-Vindas

**URL**: `/welcome`

**Funcionalidades**:
- ✅ Mensagem de boas-vindas personalizada com nome do usuário
- ✅ Explicação do processo de aprovação
- ✅ Botão para solicitar desbloqueio via WhatsApp
- ✅ Lista do que o usuário pode fazer enquanto aguarda aprovação
- ✅ Verificação automática de status (se aprovado, redireciona para galeria)

**Acessos permitidos para usuários bloqueados**:
- ✅ Visualizar galeria pública (/)
- ✅ Ver detalhes de obras (/obras/:id)
- ✅ Visualizar perfis públicos de artistas (/artist/:userId)
- ✅ Página de boas-vindas (/welcome)
- ✅ Autenticação (/auth)

**Acessos bloqueados** (redirecionam para /welcome):
- ❌ Minha Galeria (/my-gallery)
- ❌ Criar Nova Obra (/admin/new-obra)
- ❌ Editar Obra (/admin/edit-obra/:id)
- ❌ Gerenciamento de Usuários (/admin/users)
- ❌ Analytics (/admin/analytics)
- ❌ Perfil (/profile)

### 3. Solicitação de Desbloqueio via WhatsApp

**Quando o usuário clica no botão "Solicitar Desbloqueio via WhatsApp"**:

1. Abre WhatsApp Web/App com mensagem pré-formatada:
   ```
   Olá! Sou [Nome do Usuário] e acabei de me cadastrar na 
   plataforma Minhas Artes. Gostaria de solicitar o desbloqueio 
   da minha conta.
   ```

2. Número do admin é configurado na página de Configurações do Admin.

### 4. Aprovação pelo Admin

**Opção 1: Via Dashboard Supabase**

```sql
-- No SQL Editor do Supabase
UPDATE "user" 
SET bloc = false 
WHERE email = 'email@usuario.com';
-- ou
WHERE id = 'user_id_aqui';
```

**Opção 2: Via Painel de Gerenciamento de Usuários**

1. Admin acessa `/admin/users`
2. Localiza o novo usuário
3. Clica em "Editar"
4. Desmarca opção "Bloqueado"
5. Salva alterações

### 5. Acesso Liberado

Após aprovação:
- ✅ Usuário pode acessar todas as funcionalidades
- ✅ Na próxima visita ao `/welcome`, será automaticamente redirecionado
- ✅ Pode criar e gerenciar obras
- ✅ Tem acesso ao perfil completo

## 🗄️ Estrutura do Banco de Dados

### Alterações na Tabela `user`

```sql
-- Valor padrão atualizado
ALTER TABLE "user" 
ALTER COLUMN bloc SET DEFAULT true;
```

### Trigger Atualizado

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."user" (id, nome, admin, bloc)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    false,  -- Admin sempre false para novos usuários
    true    -- Bloqueado por padrão - requer aprovação
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 🛠️ Arquivos Criados/Modificados

### Novos Arquivos

1. **`src/pages/WelcomePage.tsx`**
   - Página de boas-vindas com design atraente
   - Verifica status de bloqueio automaticamente
   - Integração com WhatsApp

2. **`src/components/ProtectedRoute.tsx`**
   - Middleware de proteção de rotas
   - Verifica se usuário está autenticado
   - Verifica se usuário está bloqueado
   - Redireciona conforme necessário

3. **`supabase/migrations/20260112_set_default_blocked.sql`**
   - Script SQL para alterar comportamento padrão
   - Atualiza trigger de criação de usuários

### Arquivos Modificados

1. **`src/App.tsx`**
   - Adicionada rota `/welcome`
   - Rotas protegidas com `ProtectedRoute`
   - Importação do componente `WelcomePage`

2. **`src/pages/AuthPage.tsx`**
   - Signup redireciona para `/welcome`
   - Login verifica status de bloqueio
   - Redireciona conforme status

3. **`src/pages/AdminSettingsPage.tsx`**
   - Adicionado campo para configurar o WhatsApp do administrador.

## ⚙️ Configuração Inicial

### 1. Configurar WhatsApp do Administrador

1.  Acesse a página de **Configurações de Administrador** (`/admin/settings`).
2.  No campo **"WhatsApp do Administrador"**, insira o número de telefone completo.
3.  **Formato obrigatório**: Código do país + DDD + número (sem espaços, apenas números e o sinal `+`).
    -   Exemplo Brasil: `+5511987654321`
    -   Exemplo Portugal: `+351912345678`
4.  Salve as configurações.

### 2. Executar Migration

No Supabase Dashboard → SQL Editor:

```sql
-- Cole o conteúdo de:
-- supabase/migrations/20260112_set_default_blocked.sql
```

### 3. Reiniciar Servidor de Desenvolvimento

```bash
# Parar servidor (Ctrl+C)
npm run dev
# ou
pnpm dev
```

## 🧪 Testando o Fluxo

### Teste Completo

1. **Criar novo usuário**:
   - Acessar `/auth`
   - Preencher formulário de cadastro
   - Verificar redirecionamento para `/welcome`

2. **Verificar restrições**:
   - Tentar acessar `/my-gallery` → redireciona para `/welcome`
   - Tentar acessar `/profile` → redireciona para `/welcome`
   - Acessar `/` (galeria pública) → funciona ✅

3. **Solicitar desbloqueio**:
   - Clicar no botão de WhatsApp
   - Verificar se abre com mensagem correta
   - Verificar se número do admin está correto

4. **Aprovar usuário** (como admin):
   ```sql
   UPDATE "user" 
   SET bloc = false 
   WHERE email = 'email@teste.com';
   ```

5. **Verificar aprovação**:
   - Acessar `/welcome` → redireciona para `/my-gallery` ✅
   - Criar obra → funciona ✅
   - Acessar perfil → funciona ✅

## 📱 Mensagem do WhatsApp

### Formato Enviado

```
Olá! Sou [Nome Real do Usuário] e acabei de me cadastrar na 
plataforma Minhas Artes. Gostaria de solicitar o desbloqueio 
da minha conta.
```

### Personalização

Para alterar a mensagem, edite `src/pages/WelcomePage.tsx`:

```typescript
const message = `Sua mensagem personalizada aqui. Nome: ${userName}`;
```

## 🔒 Segurança

### Proteções Implementadas

1. **ProtectedRoute**:
   - Verifica autenticação antes de permitir acesso
   - Verifica status de bloqueio
   - Previne acesso direto via URL

2. **Verificação em Tempo Real**:
   - WelcomePage verifica status a cada carregamento
   - Se usuário foi aprovado, redireciona automaticamente

3. **Fallback de Login**:
   - Login verifica status após autenticação
   - Redireciona para página apropriada

## 🎨 Personalização da Página de Boas-Vindas

### Alterar Cores/Ícones

Edite `src/pages/WelcomePage.tsx`:

```typescript
// Ícone principal
<Sparkles className="h-16 w-16 mx-auto text-yellow-500 mb-4" />

// Gradiente do título
<h1 className="bg-gradient-to-r from-purple-600 to-pink-600">

// Cor do botão WhatsApp
<Button className="bg-green-600 hover:bg-green-700">
```

### Alterar Texto de Boas-Vindas

```typescript
<h1>Bem-vindo ao Minhas Artes!</h1>
<p>Olá, <span>{userName}</span>! 👋</p>
```

## 🐛 Troubleshooting

### Usuário não redireciona para /welcome após cadastro

**Causa**: Delay no signup  
**Solução**: Verifique se há erro no console. O redirecionamento tem delay de 1 segundo.

### Botão WhatsApp não abre corretamente

**Causa**: Número de telefone inválido ou não configurado.
**Solução**: Verifique o formato na página de Configurações do Admin:
- ✅ `+5511999999999` (correto)
- ❌ `11 9 9999-9999` (incorreto)
- ❌ `(11) 99999-9999` (incorreto)

### Usuário aprovado continua vendo página de welcome

**Causa**: Cache ou verificação não executou  
**Solução**: 
1. Fazer logout e login novamente
2. Limpar cache do navegador
3. Verificar no banco se `bloc = false`

### Página de welcome aparece em branco

**Causa**: Erro ao buscar dados do usuário  
**Solução**: 
1. Abrir console (F12) e verificar erros
2. Confirmar que trigger criou registro na tabela `user`
3. Verificar RLS da tabela `user`

## 📊 Monitoramento

### Verificar Usuários Pendentes de Aprovação

```sql
SELECT 
  id,
  nome,
  email,
  created_at
FROM "user"
WHERE bloc = true
ORDER BY created_at DESC;
```

### Contar Usuários Aprovados vs Bloqueados

```sql
SELECT 
  bloc,
  COUNT(*) as total,
  CASE WHEN bloc THEN 'Bloqueados' ELSE 'Aprovados' END as status
FROM "user"
GROUP BY bloc;
```

---

**Última atualização**: 2026-01-12  
**Versão**: 1.2.0
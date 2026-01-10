# 🔐 Guia de Autenticação - Supabase Auth

## ⚠️ IMPORTANTE: Não adicione email/senha na tabela `user`!

O Supabase possui um sistema de autenticação próprio que gerencia credenciais de forma segura.

---

## 📊 Arquitetura de Autenticação

### Tabelas Separadas

```
┌─────────────────────────────────────┐
│     auth.users (Supabase Auth)      │
│  ✅ Gerenciado automaticamente      │
├─────────────────────────────────────┤
│ • id (UUID)                         │
│ • email                             │
│ • encrypted_password (hash seguro)  │
│ • raw_user_meta_data (JSON)         │
│ • created_at                        │
│ • last_sign_in_at                   │
└─────────────────────────────────────┘
           │
           │ Trigger: handle_new_user()
           │ (Copia id e metadata)
           ↓
┌─────────────────────────────────────┐
│      public.user (Perfil)           │
│  ✅ Gerenciado por você             │
├─────────────────────────────────────┤
│ • id (bigint) ← MESMO id de auth    │
│ • nome                              │
│ • descricao                         │
│ • foto                              │
│ • admin                             │
│ • bloc                              │
│ • created_at                        │
└─────────────────────────────────────┘
```

---

## 🚀 Fluxo de Cadastro (Signup)

### 1. Frontend chama:
```typescript
await supabase.auth.signUp({
  email: "user@example.com",
  password: "senha123",
  options: {
    data: {
      nome: "João Silva"  // ← Vai para raw_user_meta_data
    }
  }
});
```

### 2. Supabase faz automaticamente:
- ✅ Cria registro em `auth.users` com senha **criptografada**
- ✅ Dispara trigger `on_auth_user_created`
- ✅ Trigger executa `handle_new_user()`
- ✅ Cria registro em `public.user` com:
  - `id` = mesmo UUID de `auth.users.id`
  - `nome` = extraído de `raw_user_meta_data->>'nome'`
  - `admin` = `false` (padrão)
  - `bloc` = `false` (padrão)

---

## 🔧 AÇÃO OBRIGATÓRIA: Remover Colunas Inseguras

### Execute no Supabase SQL Editor:

```sql
-- Remover email e senha da tabela user
ALTER TABLE "user" DROP COLUMN IF EXISTS email;
ALTER TABLE "user" DROP COLUMN IF EXISTS senha;
```

Ou execute o arquivo: `supabase/migrations/remove_duplicate_auth_fields.sql`

---

## 🛡️ Por que NÃO adicionar email/senha na tabela `user`?

### ❌ Problemas

1. **Senhas em texto plano** = Extremamente perigoso
2. **Duplicação de dados** = Email duplicado
3. **Violação LGPD** = Dados sensíveis sem proteção
4. **SQL Injection** = Vulnerabilidade crítica

### ✅ Vantagens do Supabase Auth

1. Criptografia bcrypt automática
2. Token JWT seguro
3. Rate limiting contra brute force
4. Suporte a 2FA
5. OAuth pronto (Google, GitHub)

---

## 📝 Como Usar Corretamente

### Cadastro
```typescript
const { error } = await supabase.auth.signUp({
  email: values.email,
  password: values.password,
  options: { data: { nome: values.nome } }
});
```

### Login
```typescript
const { error } = await supabase.auth.signInWithPassword({
  email: values.email,
  password: values.password
});
```

### Buscar Perfil
```typescript
const { data: { user } } = await supabase.auth.getUser();
const { data } = await supabase.from("user").select("*").eq("id", user.id).single();
```

### Logout
```typescript
await supabase.auth.signOut();
```

---

**Última atualização**: 2026-01-10

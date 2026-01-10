# 🔄 Guia de Migração de Usuários

## ⚠️ SITUAÇÃO ATUAL

Você está cadastrando usuários **diretamente na tabela `user`** com email e senha em texto plano.

**Problema**: Isso NÃO usa o sistema de autenticação do Supabase!

---

## ✅ SOLUÇÃO: Migrar para Supabase Auth

### Opção 1: Começar do Zero (Recomendado) 🚀

**Quando usar**: Se você tem poucos usuários de teste

**Passos**:

1. **Limpar tabela user**
```sql
-- Execute no Supabase SQL Editor
DELETE FROM "user";
```

2. **Remover colunas email/senha**
```sql
ALTER TABLE "user" DROP COLUMN IF EXISTS email;
ALTER TABLE "user" DROP COLUMN IF EXISTS senha;
```

3. **Aplicar migração principal**
```sql
-- Cole todo o conteúdo de:
supabase/migrations/20260110_fix_all_tables.sql
```

4. **Testar cadastro**
- Acesse `/auth`
- Crie novo usuário
- Faça login

---

### Opção 2: Migrar Usuários Existentes 📦

**Quando usar**: Se você tem usuários reais que precisa manter

#### Método A: Manual (Simples)

Para cada usuário na tabela `user`:

1. **Ir em Supabase Dashboard**
   - Authentication > Users > Add User

2. **Criar manualmente**
   - Email: (copiar da tabela user)
   - Password: Senha temporária
   - ✅ Auto Confirm User

3. **Enviar reset de senha**
   - Usuário receberá email para definir nova senha

#### Método B: Script Automático (Avançado)

**Pré-requisitos**:
- Node.js instalado
- Service Role Key do Supabase

**Passos**:

1. **Criar arquivo `.env`**
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

2. **Instalar dependências**
```bash
npm install @supabase/supabase-js dotenv
```

3. **Executar migração**
```bash
node scripts/migrate-users.js
```

4. **Verificar resultado**
- Todos os usuários terão senha temporária: `MudarSenha123!`
- Envie instruções para reset de senha

5. **Remover colunas duplicadas**
```sql
ALTER TABLE "user" DROP COLUMN email;
ALTER TABLE "user" DROP COLUMN senha;
```

---

## 🔍 Como Verificar se Migração Funcionou

### 1. Verificar auth.users
```sql
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;
```

### 2. Verificar sincronização
```sql
SELECT 
  au.email as auth_email,
  u.nome as user_nome,
  u.admin
FROM auth.users au
LEFT JOIN "user" u ON au.id::text = u.id::text;
```

### 3. Testar login
- Acesse `/auth`
- Faça login com email/senha
- Deve funcionar! ✅

---

## 🎯 Fluxo Correto Após Migração

### Cadastro (Novo Usuário)
```
Usuário acessa /auth → Preenche formulário
     ↓
supabase.auth.signUp() cria em auth.users
     ↓
Trigger cria perfil em public.user
     ↓
✅ Usuário pode fazer login
```

### Login
```
Usuário acessa /auth → Preenche email/senha
     ↓
supabase.auth.signInWithPassword() valida
     ↓
Token JWT é retornado
     ↓
✅ Usuário está autenticado
```

---

## ⚠️ IMPORTANTE: O Que NÃO Fazer

❌ **Não insira direto na tabela user**
```sql
-- ERRADO!
INSERT INTO "user" (nome, email, senha) VALUES (...);
```

✅ **Use sempre Supabase Auth**
```typescript
// CORRETO!
await supabase.auth.signUp({
  email: '...',
  password: '...',
  options: { data: { nome: '...' } }
});
```

---

## 📋 Checklist Pós-Migração

- [ ] Todos os usuários estão em `auth.users`
- [ ] Colunas `email` e `senha` foram removidas de `user`
- [ ] Trigger `handle_new_user()` está ativo
- [ ] Teste de cadastro funciona
- [ ] Teste de login funciona
- [ ] Teste de logout funciona
- [ ] Perfil aparece após login

---

## 🆘 Problemas Comuns

### "Email já existe"
**Causa**: Usuário já está em `auth.users`
**Solução**: Use email diferente ou delete o antigo

### "Trigger não executa"
**Causa**: Script principal não foi aplicado
**Solução**: Execute `20260110_fix_all_tables.sql`

### "Login não funciona"
**Causa**: Usuário não está em `auth.users`
**Solução**: Migre o usuário ou crie novo

---

## 📞 Precisa de Ajuda?

1. Verifique logs do Supabase Dashboard
2. Consulte `docs/AUTHENTICATION_GUIDE.md`
3. Execute queries de verificação acima

---

**Última atualização**: 2026-01-10

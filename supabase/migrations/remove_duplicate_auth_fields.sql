-- =====================================================
-- CORREÇÃO: Remover campos de autenticação duplicados
-- Data: 2026-01-10
-- Descrição: Remove email e senha da tabela user
-- =====================================================

-- IMPORTANTE: Supabase Auth já gerencia email e senha na tabela auth.users
-- A tabela user deve APENAS armazenar dados de perfil

-- 1. Verificar dados antes de remover
SELECT id, nome, email, senha FROM "user" WHERE email IS NOT NULL OR senha IS NOT NULL;

-- 2. Remover colunas email e senha
ALTER TABLE "user" DROP COLUMN IF EXISTS email;
ALTER TABLE "user" DROP COLUMN IF EXISTS senha;

-- 3. Verificar estrutura final
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user' 
  AND table_schema = 'public';

-- =====================================================
-- A autenticação agora funciona assim:
-- 1. Usuário faz signup via supabase.auth.signUp()
-- 2. Registro é criado em auth.users (email + senha criptografada)
-- 3. Trigger handle_new_user() cria registro em public.user (perfil)
-- 4. Login é feito via supabase.auth.signInWithPassword()
-- =====================================================

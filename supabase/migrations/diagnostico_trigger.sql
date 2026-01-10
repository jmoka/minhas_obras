-- =====================================================
-- DIAGNÓSTICO: Por que perfil não foi criado?
-- =====================================================

-- 1. Verificar se o trigger existe e está ativo
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';

-- 2. Verificar se a função existe
SELECT 
  proname as function_name,
  prosrc as function_code
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- 3. Ver usuários em auth.users
SELECT 
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC;

-- 4. Ver usuários na tabela user
SELECT 
  id,
  nome,
  created_at
FROM "user" 
ORDER BY created_at DESC;

-- 5. Verificar se há ALGUM usuário sem perfil
SELECT 
  au.id as auth_id,
  au.email,
  u.id as user_id,
  u.nome,
  CASE 
    WHEN u.id IS NULL THEN '❌ SEM PERFIL'
    ELSE '✅ COM PERFIL'
  END as status
FROM auth.users au
LEFT JOIN "user" u ON u.id = ('x' || substring(replace(au.id::text, '-', ''), 1, 15))::bit(60)::bigint
ORDER BY au.created_at DESC;

-- 6. Verificar logs de erro (se disponível)
-- Nota: Isso só funciona se você tiver acesso aos logs do Postgres
SELECT * FROM pg_stat_activity WHERE query LIKE '%handle_new_user%';

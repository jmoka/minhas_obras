-- =====================================================
-- SOLUÇÃO: Desabilitar RLS temporariamente
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Desabilitar RLS nas tabelas
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;
ALTER TABLE obras DISABLE ROW LEVEL SECURITY;
ALTER TABLE imgs DISABLE ROW LEVEL SECURITY;

-- 2. Verificar
SELECT 
  tablename, 
  rowsecurity as "RLS Ativo?"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user', 'obras', 'imgs');

-- Resultado esperado: todas com rowsecurity = false

-- =====================================================
-- ✅ Agora teste novamente editar o perfil!
-- =====================================================

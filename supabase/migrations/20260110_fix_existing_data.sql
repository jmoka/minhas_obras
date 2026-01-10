-- =====================================================
-- SCRIPT DE CORREÇÃO DE DADOS EXISTENTES
-- Execute APÓS o script principal de correção
-- =====================================================

-- Este script cria o perfil do usuário se não existir
-- Você deve substituir os valores abaixo pelos dados corretos

-- Passo 1: Descobrir o UUID do usuário autenticado
-- Execute esta query no Supabase para ver os usuários:
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;

-- Passo 2: Criar perfil para o usuário (se não existir)
-- Substitua 'SEU_UUID_AQUI' pelo ID retornado na query acima
-- Substitua 'Seu Nome' pelo nome do usuário

/*
INSERT INTO "user" (id, nome, admin, bloc)
VALUES (
  'SEU_UUID_AQUI',
  'Seu Nome',
  false,
  false
)
ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- OU: Atualizar ID de um perfil existente
-- Se você já tem dados no perfil antigo e quer migrar
-- =====================================================

/*
-- 1. Primeiro, veja os perfis existentes:
SELECT * FROM "user";

-- 2. Atualize o ID do perfil para o UUID do auth.users:
UPDATE "user" 
SET id = 'UUID_DO_AUTH_USERS' 
WHERE id = 'ID_ANTIGO_DO_PERFIL';
*/

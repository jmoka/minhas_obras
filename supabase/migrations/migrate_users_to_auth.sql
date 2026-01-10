-- =====================================================
-- MIGRAÇÃO: Mover usuários existentes para Supabase Auth
-- Data: 2026-01-10
-- ATENÇÃO: Execute este script SOMENTE UMA VEZ!
-- =====================================================

-- PASSO 1: Verificar usuários existentes na tabela user
SELECT id, nome, email, senha, admin 
FROM "user" 
WHERE email IS NOT NULL;

-- =====================================================
-- IMPORTANTE: Não é possível migrar senhas automaticamente!
-- 
-- MOTIVO: As senhas na tabela 'user' provavelmente estão em
-- texto plano. O Supabase Auth usa bcrypt para criptografia,
-- então precisamos que os usuários redefinam suas senhas.
-- =====================================================

-- OPÇÃO 1: Criar usuários no Supabase Auth manualmente
-- =====================================================
-- Para cada usuário na tabela 'user', você precisa:
-- 1. Ir em Supabase Dashboard > Authentication > Users
-- 2. Clicar em "Add User"
-- 3. Usar o MESMO email
-- 4. Definir senha temporária
-- 5. Enviar email de reset de senha

-- OPÇÃO 2: Usar SQL para criar usuários (requer Service Role)
-- =====================================================
-- ATENÇÃO: Isso só funciona via API com service_role_key
-- Não pode ser executado diretamente no SQL Editor

/*
-- Exemplo de código para backend (Node.js/Deno):
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Para cada usuário:
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email: user.email,
  password: 'SenhaTemporaria123!', // Usuário deve alterar
  email_confirm: true,
  user_metadata: {
    nome: user.nome
  }
});
*/

-- PASSO 2: Limpar dados duplicados após migração
-- =====================================================
-- EXECUTE SOMENTE DEPOIS de migrar todos os usuários!

-- Verificar se IDs existem em auth.users
SELECT 
  u.id as user_id,
  u.email as user_email,
  au.id as auth_id,
  au.email as auth_email
FROM "user" u
LEFT JOIN auth.users au ON u.id::text = au.id::text;

-- PASSO 3: Remover colunas email e senha
-- =====================================================
-- EXECUTE SOMENTE DEPOIS de confirmar que todos os usuários
-- foram migrados para auth.users!

ALTER TABLE "user" DROP COLUMN IF EXISTS email;
ALTER TABLE "user" DROP COLUMN IF EXISTS senha;

-- PASSO 4: Verificar estrutura final
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Coluna           | Tipo
-- -----------------+---------------------------
-- id               | bigint
-- created_at       | timestamp with time zone
-- nome             | text
-- descricao        | text
-- foto             | text (não uuid!)
-- bloc             | boolean
-- admin            | boolean
-- =====================================================

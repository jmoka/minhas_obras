-- =====================================================
-- CORREÇÃO COMPLETA DO SISTEMA
-- Data: 2026-01-10
-- Descrição: Corrige schema, dados, RLS e segurança
-- Usa UUID diretamente como string para IDs
-- =====================================================

-- ===========================================
-- FASE 1: CORREÇÃO DO SCHEMA
-- ===========================================

-- 1.1 Renomear coluna foto_done → foto_dono (se existir com nome errado)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'obras' AND column_name = 'foto_done'
  ) THEN
    ALTER TABLE obras RENAME COLUMN foto_done TO foto_dono;
    RAISE NOTICE '✅ Coluna foto_done renomeada para foto_dono';
  ELSE
    RAISE NOTICE '⚠️ Coluna foto_dono já existe ou foto_done não encontrada';
  END IF;
END $$;

-- 1.2 Garantir que a coluna foto_dono existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'obras' AND column_name = 'foto_dono'
  ) THEN
    ALTER TABLE obras ADD COLUMN foto_dono text;
    RAISE NOTICE '✅ Coluna foto_dono criada';
  END IF;
END $$;

-- ===========================================
-- FASE 2: LIMPAR DADOS INVÁLIDOS
-- ===========================================

-- 2.1 Remover usuários órfãos (sem correspondência em auth.users)
-- Primeiro, vamos garantir que existe um usuário válido
-- Comentado para evitar perda de dados - descomentar se necessário
-- DELETE FROM "user" WHERE id NOT IN (SELECT id::text FROM auth.users);

-- ===========================================
-- FASE 3: IMPLEMENTAÇÃO DE SEGURANÇA (RLS)
-- ===========================================

-- 3.1 Habilitar RLS em todas as tabelas
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE imgs ENABLE ROW LEVEL SECURITY;

-- 3.2 Remover TODAS as políticas antigas para evitar conflitos
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE tablename IN ('user', 'obras', 'imgs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    RAISE NOTICE 'Removida política: % em %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- 3.3 Criar políticas para tabela "user"
-- Leitura: todos podem ver perfis
CREATE POLICY "user_select_public" ON "user"
FOR SELECT USING (true);

-- Inserção: usuário pode criar seu próprio perfil
CREATE POLICY "user_insert_own" ON "user"
FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Atualização: usuário pode atualizar seu próprio perfil OU admin pode atualizar qualquer um
CREATE POLICY "user_update_own_or_admin" ON "user"
FOR UPDATE 
USING (
  auth.uid()::text = id 
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
)
WITH CHECK (
  auth.uid()::text = id 
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
);

-- Deleção: apenas admins podem deletar
CREATE POLICY "user_delete_admin_only" ON "user"
FOR DELETE USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
);

-- 3.4 Criar políticas para tabela "obras"
-- Leitura: todos podem ver obras
CREATE POLICY "obras_select_public" ON obras
FOR SELECT USING (true);

-- Inserção: usuários autenticados podem criar obras
CREATE POLICY "obras_insert_authenticated" ON obras
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (user_id = auth.uid()::text OR user_id IS NULL)
);

-- Atualização: proprietário ou admin pode atualizar
CREATE POLICY "obras_update_owner_or_admin" ON obras
FOR UPDATE 
USING (
  user_id = auth.uid()::text 
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
)
WITH CHECK (
  user_id = auth.uid()::text 
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
);

-- Deleção: proprietário ou admin pode deletar
CREATE POLICY "obras_delete_owner_or_admin" ON obras
FOR DELETE USING (
  user_id = auth.uid()::text 
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
);

-- 3.5 Criar políticas para tabela "imgs"
-- Leitura: todos podem ver imagens
CREATE POLICY "imgs_select_public" ON imgs
FOR SELECT USING (true);

-- Inserção: proprietário da obra ou admin pode adicionar
CREATE POLICY "imgs_insert_owner_or_admin" ON imgs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id::text = imgs.obras_id::text 
    AND (user_id = auth.uid()::text OR user_id IS NULL)
  )
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
);

-- Atualização: proprietário da obra ou admin pode atualizar
CREATE POLICY "imgs_update_owner_or_admin" ON imgs
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id::text = imgs.obras_id::text 
    AND user_id = auth.uid()::text
  )
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id::text = imgs.obras_id::text 
    AND user_id = auth.uid()::text
  )
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
);

-- Deleção: proprietário da obra ou admin pode deletar
CREATE POLICY "imgs_delete_owner_or_admin" ON imgs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id::text = imgs.obras_id::text 
    AND user_id = auth.uid()::text
  )
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
);

-- ===========================================
-- FASE 4: TRIGGER PARA AUTO-CRIAÇÃO DE PERFIL
-- ===========================================

-- 4.1 Criar função para auto-criação de perfil quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."user" (id, nome, admin, bloc)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    false,
    false
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Perfil já existe, ignorar
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Criar trigger (remove anterior se existir)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VALIDAÇÃO FINAL
-- =====================================================

SELECT '====== VALIDAÇÃO DO SISTEMA ======' AS status;

-- Verificar coluna foto_dono existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'obras' AND column_name = 'foto_dono'
    ) THEN '✅ Coluna foto_dono existe'
    ELSE '❌ Coluna foto_dono NÃO existe'
  END AS verificacao_foto_dono;

-- Verificar RLS habilitado
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS Habilitado' ELSE '❌ RLS Desabilitado' END AS status_rls
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user', 'obras', 'imgs');

-- Verificar políticas criadas
SELECT 
  tablename,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename IN ('user', 'obras', 'imgs')
GROUP BY tablename;

-- Verificar trigger existe
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'on_auth_user_created'
    ) THEN '✅ Trigger on_auth_user_created existe'
    ELSE '❌ Trigger on_auth_user_created NÃO existe'
  END AS verificacao_trigger;

-- =====================================================
SELECT '✅ CORREÇÃO CONCLUÍDA COM SUCESSO!' AS resultado;
-- =====================================================

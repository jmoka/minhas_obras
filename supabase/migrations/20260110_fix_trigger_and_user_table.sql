-- =====================================================
-- CORREÇÃO DO TRIGGER E TABELA USER
-- O problema: a tabela user.id é bigint, mas auth.users.id é UUID
-- Solução: Alterar a coluna user.id para TEXT
-- =====================================================

-- PASSO 1: Desabilitar RLS temporariamente para permitir alterações
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;
ALTER TABLE obras DISABLE ROW LEVEL SECURITY;
ALTER TABLE imgs DISABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover constraints e foreign keys que dependem de user.id
ALTER TABLE obras DROP CONSTRAINT IF EXISTS fk_obras_user_id;
ALTER TABLE obras DROP CONSTRAINT IF EXISTS obras_user_id_fkey;

-- PASSO 3: Alterar o tipo da coluna user.id para TEXT
-- Primeiro, limpar a tabela user (dados antigos incompatíveis)
-- ATENÇÃO: Isso vai deletar os perfis existentes!
TRUNCATE TABLE "user" CASCADE;

-- Agora alterar o tipo da coluna id
ALTER TABLE "user" ALTER COLUMN id TYPE TEXT;

-- PASSO 4: Alterar obras.user_id para TEXT também
ALTER TABLE obras ALTER COLUMN user_id TYPE TEXT;

-- PASSO 5: Recriar a foreign key (opcional, pode deixar sem)
-- ALTER TABLE obras ADD CONSTRAINT fk_obras_user_id 
--   FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL;

-- PASSO 6: Corrigir a coluna foto_dono
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'obras' AND column_name = 'foto_done'
  ) THEN
    ALTER TABLE obras RENAME COLUMN foto_done TO foto_dono;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'obras' AND column_name = 'foto_dono'
  ) THEN
    ALTER TABLE obras ADD COLUMN foto_dono TEXT;
  END IF;
END $$;

-- PASSO 7: Recriar o trigger corretamente
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
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASSO 8: Habilitar RLS novamente
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE imgs ENABLE ROW LEVEL SECURITY;

-- PASSO 9: Criar políticas RLS
DROP POLICY IF EXISTS "user_select_public" ON "user";
DROP POLICY IF EXISTS "user_insert_own" ON "user";
DROP POLICY IF EXISTS "user_update_own_or_admin" ON "user";
DROP POLICY IF EXISTS "user_delete_admin_only" ON "user";

CREATE POLICY "user_select_public" ON "user" FOR SELECT USING (true);
CREATE POLICY "user_insert_own" ON "user" FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "user_update_own_or_admin" ON "user" FOR UPDATE 
  USING (auth.uid()::text = id OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true))
  WITH CHECK (auth.uid()::text = id OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true));
CREATE POLICY "user_delete_admin_only" ON "user" FOR DELETE 
  USING (EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true));

DROP POLICY IF EXISTS "obras_select_public" ON obras;
DROP POLICY IF EXISTS "obras_insert_authenticated" ON obras;
DROP POLICY IF EXISTS "obras_update_owner_or_admin" ON obras;
DROP POLICY IF EXISTS "obras_delete_owner_or_admin" ON obras;

CREATE POLICY "obras_select_public" ON obras FOR SELECT USING (true);
CREATE POLICY "obras_insert_authenticated" ON obras FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "obras_update_owner_or_admin" ON obras FOR UPDATE 
  USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true))
  WITH CHECK (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true));
CREATE POLICY "obras_delete_owner_or_admin" ON obras FOR DELETE 
  USING (user_id = auth.uid()::text OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true));

DROP POLICY IF EXISTS "imgs_select_public" ON imgs;
CREATE POLICY "imgs_select_public" ON imgs FOR SELECT USING (true);
CREATE POLICY "imgs_insert_owner" ON imgs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "imgs_update_owner" ON imgs FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "imgs_delete_owner" ON imgs FOR DELETE USING (auth.uid() IS NOT NULL);

-- =====================================================
SELECT '✅ CORREÇÃO CONCLUÍDA!' AS resultado;
-- =====================================================

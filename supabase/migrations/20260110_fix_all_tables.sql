-- =====================================================
-- MIGRAÇÃO: Correção Completa do Sistema de Cadastros
-- Data: 2026-01-10
-- Descrição: Corrige tipos, relacionamentos, triggers e RLS
-- =====================================================

-- 1. CORREÇÃO DE TIPOS DE DADOS
-- =====================================================

-- 1.1 Alterar obras.user_id para bigint
ALTER TABLE obras 
ALTER COLUMN user_id TYPE bigint 
USING user_id::bigint;

-- 1.2 Recriar imgs.obras_id como bigint (remover uuid)
ALTER TABLE imgs DROP COLUMN IF EXISTS obras_id;
ALTER TABLE imgs ADD COLUMN obras_id bigint;

-- 1.3 Adicionar coluna url em imgs
ALTER TABLE imgs ADD COLUMN IF NOT EXISTS url text;
COMMENT ON COLUMN imgs.url IS 'Caminho do arquivo no Supabase Storage';

-- 2. CHAVES ESTRANGEIRAS
-- =====================================================

-- 2.1 Limpar dados órfãos
DELETE FROM obras WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM "user");
DELETE FROM imgs WHERE obras_id IS NOT NULL AND obras_id NOT IN (SELECT id FROM obras);

-- 2.2 Adicionar FKs
ALTER TABLE obras
ADD CONSTRAINT IF NOT EXISTS fk_obras_user_id 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE imgs
ADD CONSTRAINT IF NOT EXISTS fk_imgs_obras_id 
FOREIGN KEY (obras_id) REFERENCES obras(id) ON DELETE CASCADE;

-- 2.3 Criar índices
CREATE INDEX IF NOT EXISTS idx_obras_user_id ON obras(user_id);
CREATE INDEX IF NOT EXISTS idx_imgs_obras_id ON imgs(obras_id);

-- 3. TRIGGER PARA AUTO-CRIAÇÃO DE PERFIL
-- =====================================================

-- 3.1 Função para criar perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public."user" (id, nome, admin, bloc)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    false,
    false
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Criar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3.3 Permitir inserção manual de ID em user
ALTER TABLE "user" ALTER COLUMN id DROP DEFAULT;

-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- 4.1 Habilitar RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE imgs ENABLE ROW LEVEL SECURITY;

-- 4.2 Remover políticas existentes (se houver)
DROP POLICY IF EXISTS "Perfis são visíveis publicamente" ON "user";
DROP POLICY IF EXISTS "Usuários podem criar próprio perfil" ON "user";
DROP POLICY IF EXISTS "Usuários podem atualizar próprio perfil ou admin pode atualizar qualquer um" ON "user";
DROP POLICY IF EXISTS "Apenas admins podem deletar usuários" ON "user";

DROP POLICY IF EXISTS "Obras são visíveis publicamente" ON obras;
DROP POLICY IF EXISTS "Usuários autenticados podem criar obras" ON obras;
DROP POLICY IF EXISTS "Proprietário ou admin pode atualizar obras" ON obras;
DROP POLICY IF EXISTS "Proprietário ou admin pode deletar obras" ON obras;

DROP POLICY IF EXISTS "Imagens da galeria são visíveis publicamente" ON imgs;
DROP POLICY IF EXISTS "Proprietário da obra ou admin pode adicionar imagens" ON imgs;
DROP POLICY IF EXISTS "Proprietário da obra ou admin pode atualizar imagens" ON imgs;
DROP POLICY IF EXISTS "Proprietário da obra ou admin pode deletar imagens" ON imgs;

-- 4.3 Políticas para tabela "user"
CREATE POLICY "Perfis são visíveis publicamente" ON "user"
FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar próprio perfil" ON "user"
FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuários podem atualizar próprio perfil ou admin pode atualizar qualquer um" ON "user"
FOR UPDATE 
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true))
WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true));

CREATE POLICY "Apenas admins podem deletar usuários" ON "user"
FOR DELETE USING (EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true));

-- 4.4 Políticas para tabela "obras"
CREATE POLICY "Obras são visíveis publicamente" ON obras
FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem criar obras" ON obras
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL));

CREATE POLICY "Proprietário ou admin pode atualizar obras" ON obras
FOR UPDATE 
USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true))
WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true));

CREATE POLICY "Proprietário ou admin pode deletar obras" ON obras
FOR DELETE USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true));

-- 4.5 Políticas para tabela "imgs"
CREATE POLICY "Imagens da galeria são visíveis publicamente" ON imgs
FOR SELECT USING (true);

CREATE POLICY "Proprietário da obra ou admin pode adicionar imagens" ON imgs
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM obras WHERE id = imgs.obras_id AND (user_id = auth.uid() OR user_id IS NULL))
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true)
);

CREATE POLICY "Proprietário da obra ou admin pode atualizar imagens" ON imgs
FOR UPDATE 
USING (
  EXISTS (SELECT 1 FROM obras WHERE id = imgs.obras_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM obras WHERE id = imgs.obras_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true)
);

CREATE POLICY "Proprietário da obra ou admin pode deletar imagens" ON imgs
FOR DELETE USING (
  EXISTS (SELECT 1 FROM obras WHERE id = imgs.obras_id AND user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid() AND admin = true)
);

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================

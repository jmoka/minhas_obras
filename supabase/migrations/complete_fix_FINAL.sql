-- =====================================================
-- LIMPEZA E CORREÇÃO COMPLETA - VERSÃO FINAL
-- Corrige conversão UUID → BIGINT
-- =====================================================

-- 1. Limpar dados existentes
DELETE FROM imgs;
DELETE FROM obras;
DELETE FROM "user";

-- 2. Remover colunas inseguras
ALTER TABLE "user" DROP COLUMN IF EXISTS email;
ALTER TABLE "user" DROP COLUMN IF EXISTS senha;

-- 3. Remover IDENTITY e permitir inserção manual
ALTER TABLE "user" ALTER COLUMN id DROP IDENTITY IF EXISTS;
ALTER TABLE "user" ALTER COLUMN id DROP DEFAULT;

-- 4. Corrigir tipos de dados
ALTER TABLE obras 
ALTER COLUMN user_id TYPE bigint 
USING user_id::bigint;

ALTER TABLE imgs DROP COLUMN IF EXISTS obras_id;
ALTER TABLE imgs ADD COLUMN obras_id bigint;
ALTER TABLE imgs ADD COLUMN IF NOT EXISTS url text;

-- 5. Adicionar Foreign Keys
ALTER TABLE obras DROP CONSTRAINT IF EXISTS fk_obras_user_id;
ALTER TABLE obras
ADD CONSTRAINT fk_obras_user_id 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE imgs DROP CONSTRAINT IF EXISTS fk_imgs_obras_id;
ALTER TABLE imgs
ADD CONSTRAINT fk_imgs_obras_id 
FOREIGN KEY (obras_id) REFERENCES obras(id) ON DELETE CASCADE;

-- 6. Criar índices
CREATE INDEX IF NOT EXISTS idx_obras_user_id ON obras(user_id);
CREATE INDEX IF NOT EXISTS idx_imgs_obras_id ON imgs(obras_id);

-- 7. CORRIGIDO: Função para auto-criação de perfil (com conversão UUID → BIGINT)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_bigint_id bigint;
BEGIN
  -- Converter UUID para bigint usando hash
  -- Pega os primeiros 16 caracteres do UUID (sem hífens) e converte para bigint
  user_bigint_id := ('x' || substring(replace(NEW.id::text, '-', ''), 1, 15))::bit(60)::bigint;
  
  INSERT INTO public."user" (id, nome, admin, bloc)
  VALUES (
    user_bigint_id,
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

-- 8. Criar trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 9. Habilitar RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE imgs ENABLE ROW LEVEL SECURITY;

-- 10. Remover políticas antigas
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

-- 11. CORRIGIDO: Políticas para "user" (com conversão UUID → BIGINT)
CREATE POLICY "Perfis são visíveis publicamente" ON "user"
FOR SELECT USING (true);

CREATE POLICY "Usuários podem criar próprio perfil" ON "user"
FOR INSERT WITH CHECK (
  id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
);

CREATE POLICY "Usuários podem atualizar próprio perfil ou admin pode atualizar qualquer um" ON "user"
FOR UPDATE 
USING (
  id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  OR 
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
)
WITH CHECK (
  id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  OR 
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
);

CREATE POLICY "Apenas admins podem deletar usuários" ON "user"
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
);

-- 12. CORRIGIDO: Políticas para "obras"
CREATE POLICY "Obras são visíveis publicamente" ON obras
FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem criar obras" ON obras
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (
    user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    OR user_id IS NULL
  )
);

CREATE POLICY "Proprietário ou admin pode atualizar obras" ON obras
FOR UPDATE 
USING (
  user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  OR 
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
)
WITH CHECK (
  user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  OR 
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
);

CREATE POLICY "Proprietário ou admin pode deletar obras" ON obras
FOR DELETE USING (
  user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  OR 
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
);

-- 13. CORRIGIDO: Políticas para "imgs"
CREATE POLICY "Imagens da galeria são visíveis publicamente" ON imgs
FOR SELECT USING (true);

CREATE POLICY "Proprietário da obra ou admin pode adicionar imagens" ON imgs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id = imgs.obras_id 
    AND (
      user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
      OR user_id IS NULL
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
);

CREATE POLICY "Proprietário da obra ou admin pode atualizar imagens" ON imgs
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id = imgs.obras_id 
    AND user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  )
  OR
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id = imgs.obras_id 
    AND user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  )
  OR
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
);

CREATE POLICY "Proprietário da obra ou admin pode deletar imagens" ON imgs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM obras 
    WHERE id = imgs.obras_id 
    AND user_id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
  )
  OR
  EXISTS (
    SELECT 1 FROM "user" 
    WHERE id = ('x' || substring(replace(auth.uid()::text, '-', ''), 1, 15))::bit(60)::bigint
    AND admin = true
  )
);

-- =====================================================
-- ✅ PRONTO! Sistema configurado com conversão UUID → BIGINT
-- =====================================================

-- Verificar estrutura final
SELECT 'Estrutura das Tabelas' as info;
SELECT 'user' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user' AND table_schema = 'public'
UNION ALL
SELECT 'obras' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'obras' AND table_schema = 'public'
UNION ALL
SELECT 'imgs' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'imgs' AND table_schema = 'public'
ORDER BY tabela, column_name;

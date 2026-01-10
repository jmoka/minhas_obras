-- =====================================================
-- CRIAÇÃO COMPLETA DO BANCO DE DADOS
-- Sistema: Minhas Artes
-- Data: 2026-01-10
-- =====================================================

-- ===========================================
-- 1. TABELA: user (perfis de artistas)
-- ===========================================
CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  nome TEXT,
  descricao TEXT,
  foto TEXT,
  bloc BOOLEAN DEFAULT FALSE,
  admin BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE "user" IS 'Perfis de usuários/artistas';
COMMENT ON COLUMN "user".id IS 'UUID do auth.users como texto';
COMMENT ON COLUMN "user".nome IS 'Nome do artista';
COMMENT ON COLUMN "user".descricao IS 'Biografia do artista';
COMMENT ON COLUMN "user".foto IS 'Caminho da foto no storage';
COMMENT ON COLUMN "user".bloc IS 'Usuário bloqueado';
COMMENT ON COLUMN "user".admin IS 'Usuário é administrador';

-- ===========================================
-- 2. TABELA: obras (obras de arte)
-- ===========================================
CREATE TABLE IF NOT EXISTS obras (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  titulo TEXT,
  data_criacao DATE,
  img TEXT,
  video TEXT,
  nome_dono TEXT,
  foto_dono TEXT
);

COMMENT ON TABLE obras IS 'Obras de arte cadastradas';
COMMENT ON COLUMN obras.user_id IS 'ID do usuário que cadastrou (referência a user.id)';
COMMENT ON COLUMN obras.titulo IS 'Título da obra';
COMMENT ON COLUMN obras.data_criacao IS 'Data de criação da obra';
COMMENT ON COLUMN obras.img IS 'Caminho da imagem principal no storage';
COMMENT ON COLUMN obras.video IS 'Caminho do vídeo no storage';
COMMENT ON COLUMN obras.nome_dono IS 'Nome do proprietário atual';
COMMENT ON COLUMN obras.foto_dono IS 'Caminho da foto do proprietário no storage';

-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_obras_user_id ON obras(user_id);

-- ===========================================
-- 3. TABELA: imgs (galeria de imagens da obra)
-- ===========================================
CREATE TABLE IF NOT EXISTS imgs (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  obras_id BIGINT REFERENCES obras(id) ON DELETE CASCADE,
  url TEXT
);

COMMENT ON TABLE imgs IS 'Imagens adicionais da galeria de uma obra';
COMMENT ON COLUMN imgs.obras_id IS 'ID da obra (referência a obras.id)';
COMMENT ON COLUMN imgs.url IS 'Caminho da imagem no storage';

-- Índice para busca por obra
CREATE INDEX IF NOT EXISTS idx_imgs_obras_id ON imgs(obras_id);

-- ===========================================
-- 4. TRIGGER: Auto-criação de perfil
-- ===========================================
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
    RAISE WARNING 'Erro ao criar perfil para usuário %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===========================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ===========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE imgs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------
-- Políticas para tabela "user"
-- -----------------------------------------
CREATE POLICY "user_select_public" ON "user"
  FOR SELECT USING (true);

CREATE POLICY "user_insert_own" ON "user"
  FOR INSERT WITH CHECK (auth.uid()::text = id);

CREATE POLICY "user_update_own" ON "user"
  FOR UPDATE USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "user_delete_admin" ON "user"
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM "user" WHERE id = auth.uid()::text AND admin = true)
  );

-- -----------------------------------------
-- Políticas para tabela "obras"
-- -----------------------------------------
CREATE POLICY "obras_select_public" ON obras
  FOR SELECT USING (true);

CREATE POLICY "obras_insert_authenticated" ON obras
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "obras_update_owner" ON obras
  FOR UPDATE USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "obras_delete_owner" ON obras
  FOR DELETE USING (user_id = auth.uid()::text);

-- -----------------------------------------
-- Políticas para tabela "imgs"
-- -----------------------------------------
CREATE POLICY "imgs_select_public" ON imgs
  FOR SELECT USING (true);

CREATE POLICY "imgs_insert_authenticated" ON imgs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "imgs_update_owner" ON imgs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM obras WHERE id = imgs.obras_id AND user_id = auth.uid()::text)
  );

CREATE POLICY "imgs_delete_owner" ON imgs
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM obras WHERE id = imgs.obras_id AND user_id = auth.uid()::text)
  );

-- ===========================================
-- 6. STORAGE BUCKET
-- ===========================================
-- Nota: Execute isso separadamente se o bucket não existir
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('art_gallery', 'art_gallery', true)
-- ON CONFLICT (id) DO NOTHING;

-- ===========================================
-- VALIDAÇÃO
-- ===========================================
SELECT '✅ Tabela user criada' AS status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user');
SELECT '✅ Tabela obras criada' AS status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'obras');
SELECT '✅ Tabela imgs criada' AS status WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'imgs');
SELECT '✅ Trigger criado' AS status WHERE EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created');

SELECT '🎉 BANCO DE DADOS CRIADO COM SUCESSO!' AS resultado;

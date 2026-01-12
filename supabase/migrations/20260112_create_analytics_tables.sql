-- Criar tabela de visitas ao site
CREATE TABLE IF NOT EXISTS site_visits (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT NOT NULL,
  ip_hash TEXT,
  session_id UUID NOT NULL,
  country TEXT,
  city TEXT,
  duration_seconds INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar tabela de visualizações de obras
CREATE TABLE IF NOT EXISTS obra_views (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  obra_id BIGINT NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  session_id UUID NOT NULL,
  duration_seconds INTEGER DEFAULT 0,
  country TEXT,
  city TEXT
);

-- Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_site_visits_ip ON site_visits(ip_address);
CREATE INDEX IF NOT EXISTS idx_site_visits_session ON site_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_site_visits_created_at ON site_visits(created_at);

CREATE INDEX IF NOT EXISTS idx_obra_views_obra_id ON obra_views(obra_id);
CREATE INDEX IF NOT EXISTS idx_obra_views_session ON obra_views(session_id);
CREATE INDEX IF NOT EXISTS idx_obra_views_created_at ON obra_views(created_at);

-- Função para hashear IP (opcional para privacidade)
CREATE OR REPLACE FUNCTION hash_ip(ip TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(ip || 'minhas_artes_salt_2026', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para atualizar last_activity automaticamente
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_activity = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_visits_update_last_activity
  BEFORE UPDATE ON site_visits
  FOR EACH ROW
  WHEN (OLD.duration_seconds IS DISTINCT FROM NEW.duration_seconds)
  EXECUTE FUNCTION update_last_activity();

-- Função helper para obter contagem de views por obra
CREATE OR REPLACE FUNCTION get_obra_view_count(p_obra_id BIGINT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM obra_views
    WHERE obra_id = p_obra_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Habilitar RLS
ALTER TABLE site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE obra_views ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para site_visits
CREATE POLICY "Permitir leitura pública de site_visits"
  ON site_visits FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção pública de site_visits"
  ON site_visits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de própria sessão em site_visits"
  ON site_visits FOR UPDATE
  USING (true);

-- Políticas RLS para obra_views
CREATE POLICY "Permitir leitura pública de obra_views"
  ON obra_views FOR SELECT
  USING (true);

CREATE POLICY "Permitir inserção pública de obra_views"
  ON obra_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Permitir atualização de própria sessão em obra_views"
  ON obra_views FOR UPDATE
  USING (true);

-- Política para admins deletarem
CREATE POLICY "Permitir admin deletar site_visits"
  ON site_visits FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE id = auth.uid()::text AND admin = true
    )
  );

CREATE POLICY "Permitir admin deletar obra_views"
  ON obra_views FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "user"
      WHERE id = auth.uid()::text AND admin = true
    )
  );

-- Função para limpar dados antigos (opcional - executar periodicamente)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_data()
RETURNS void AS $$
BEGIN
  DELETE FROM site_visits WHERE created_at < NOW() - INTERVAL '90 days';
  DELETE FROM obra_views WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas
COMMENT ON TABLE site_visits IS 'Registra todas as visitas ao site com informações de sessão e localização';
COMMENT ON TABLE obra_views IS 'Registra visualizações individuais de cada obra de arte';
COMMENT ON FUNCTION get_obra_view_count(BIGINT) IS 'Retorna o número total de visualizações de uma obra específica';
COMMENT ON FUNCTION cleanup_old_analytics_data() IS 'Remove dados de analytics com mais de 90 dias para conformidade LGPD';

-- Script para configurar usuários como bloqueados por padrão
-- Data: 2026-01-12
-- Objetivo: Novos usuários precisam de aprovação do admin

-- 1. Alterar valor padrão da coluna bloc para true
ALTER TABLE "user" 
ALTER COLUMN bloc SET DEFAULT true;

-- 2. Atualizar função trigger para criar usuários bloqueados por padrão
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."user" (id, nome, admin, bloc)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Novo Usuário'),
    false,  -- Admin sempre false para novos usuários
    true    -- Bloqueado por padrão - requer aprovação
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Comentário explicativo
COMMENT ON COLUMN "user".bloc IS 'true = bloqueado (padrão para novos usuários), false = aprovado pelo admin';

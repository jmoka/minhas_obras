-- =====================================================
-- TESTAR CONVERSÃO UUID → BIGINT
-- Execute e me envie o resultado!
-- =====================================================

-- Seu UUID
WITH usuario AS (
  SELECT 
    'ea40e459-b1d0-45ee-9d5f-adc51b44dc50'::uuid as uuid_auth,
    '799003603834504413'::bigint as id_banco
)
SELECT 
  uuid_auth::text as "UUID Original",
  id_banco as "ID no Banco",
  
  -- Conversão SQL (método atual)
  ('x' || substring(replace(uuid_auth::text, '-', ''), 1, 15))::bit(60)::bigint as "Conversão SQL",
  
  -- Verificar se são iguais
  CASE 
    WHEN ('x' || substring(replace(uuid_auth::text, '-', ''), 1, 15))::bit(60)::bigint = id_banco 
    THEN '✅ CORRETO'
    ELSE '❌ DIFERENTE'
  END as "Status"
FROM usuario;

-- Também mostrar o HEX puro
SELECT 
  'ea40e459b1d045ee9d5f'::text as "UUID sem hífens (primeiros 15)",
  ('x' || 'ea40e459b1d045e')::bit(60)::bigint as "Conversão bit(60)";

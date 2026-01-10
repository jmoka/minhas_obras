-- Script para corrigir fotos antigas que só têm UUID sem caminho completo
-- Execute este script no Supabase SQL Editor

-- Verificar quais usuários têm foto com UUID puro (sem '/')
SELECT id, nome, foto 
FROM "user" 
WHERE foto IS NOT NULL 
  AND foto NOT LIKE '%/%';

-- IMPORTANTE: Este script assume que as fotos antigas estão na raiz do bucket
-- Se as fotos estiverem em alguma pasta específica, ajuste o UPDATE abaixo

-- Comentar esta linha abaixo após verificar os dados acima
-- UPDATE "user" 
-- SET foto = 'avatars/' || foto 
-- WHERE foto IS NOT NULL 
--   AND foto NOT LIKE '%/%';

-- ALTERNATIVA: Se as fotos antigas NÃO existem mais no Storage,
-- você pode limpar os UUIDs órfãos:
-- UPDATE "user" SET foto = NULL WHERE foto NOT LIKE '%/%';

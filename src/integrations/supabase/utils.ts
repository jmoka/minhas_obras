// Função helper para converter UUID do Supabase Auth para BIGINT
// Deve usar a MESMA lógica que o SQL:
// ('x' || substring(replace(uuid::text, '-', ''), 1, 15))::bit(60)::bigint
export const uuidToBigint = (uuid: string): string => {
  // Remove hífens e pega primeiros 15 caracteres hexadecimais
  const hex = uuid.replace(/-/g, '').substring(0, 15);
  
  // Converter para BigInt (não Number, pois pode perder precisão)
  const bigIntValue = BigInt('0x' + hex);
  
  // Retornar como string para evitar perda de precisão
  return bigIntValue.toString();
};


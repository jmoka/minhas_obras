export interface UserProfile {
  id: number; // bigint
  created_at: string;
  nome: string | null;
  descricao: string | null;
  foto: string | null; // UUID for storage reference
  bloc: boolean | null;
}

export interface Obra {
  id: number; // bigint
  created_at: string;
  user_id: number | null; // References UserProfile.id
  titulo: string | null;
  data_criacao: string | null; // date string
  img: string | null; // UUID for storage reference
  video: string | null; // UUID for storage reference
  nome_dono: string | null;
  foto_dono: string | null; // UUID for storage reference
}

export interface Img {
  id: number; // bigint
  created_at: string;
  obras_id: string | null; // UUID for obra reference
}
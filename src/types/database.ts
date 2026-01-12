export interface UserProfile {
  id: string; // bigint - agora pode vir do auth.users.id
  created_at: string;
  nome: string | null;
  descricao: string | null;
  foto: string | null; // UUID/path para storage reference
  bloc: boolean | null;
  admin: boolean | null;
}

export interface Obra {
  id: string; // bigint
  created_at: string;
  user_id: string | null; // bigint - References UserProfile.id
  titulo: string | null;
  descricao: string | null;
  data_criacao: string | null; // date string
  img: string | null; // UUID/path para storage reference
  video: string | null; // UUID/path para storage reference
  nome_dono: string | null;
  foto_dono: string | null; // UUID/path para storage reference (corrigido de foto_done)
  telefone_dono?: string | null;
  email_dono?: string | null;
  user: { // Dados do artista associado
    id: string;
    nome: string | null;
    foto: string | null;
  } | null;
}

export interface Img {
  id: string; // bigint
  created_at: string;
  obras_id: string | null; // bigint - References Obra.id
  url: string | null; // NOVO: Caminho da imagem no storage
}

export interface InsertImg {
  obras_id: string;
  url: string;
}

export interface SiteVisit {
  id: string;
  created_at: string;
  ip_address: string;
  ip_hash: string | null;
  session_id: string;
  country: string | null;
  city: string | null;
  duration_seconds: number;
  last_activity: string;
}

export interface ObraView {
  id: string;
  created_at: string;
  obra_id: number;
  ip_address: string;
  session_id: string;
  duration_seconds: number;
  country: string | null;
  city: string | null;
}

export interface GeoLocationData {
  ip: string;
  country: string | null;
  city: string | null;
}

export interface ForumTopic {
  id: number;
  created_at: string;
  title: string;
  description: string | null;
  created_by: string;
  user: {
    id: string;
    nome: string | null;
    foto: string | null;
  } | null;
}

export interface ForumMessage {
  id: number;
  created_at: string;
  content: string;
  user_id: string;
  topic_id: number;
  user: {
    id: string;
    nome: string | null;
    foto: string | null;
  } | null;
}
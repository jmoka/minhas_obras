import { supabase } from "./client";
import { Obra, UserProfile, Img, InsertImg } from "@/types/database";

const BUCKET_NAME = "art_gallery";

export const getPublicUrl = (path: string | null): string => {
  if (!path) return "/placeholder.svg";
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};

export const uploadFile = async (file: File, folder: string): Promise<string | null> => {
  if (!file) return null;
  
  const fileExtension = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error("Error uploading file:", error);
    throw new Error(`Falha ao fazer upload do arquivo: ${error.message}`);
  }

  return filePath;
};

export const fetchArtistProfile = async (): Promise<UserProfile | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.log("❌ Nenhum usuário autenticado");
    return null;
  }

  console.log("🔍 Buscando perfil para:", user.email);
  console.log("  UUID:", user.id);

  const { data, error } = await supabase
    .from("user")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("❌ Erro ao buscar perfil:", error);
    return null;
  }
  
  console.log("✅ Perfil encontrado:", data);
  return data as UserProfile | null;
};

export const insertArtistProfile = async (profileData: Omit<UserProfile, 'id' | 'created_at' | 'bloc' | 'admin'>): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("user")
    .insert([profileData])
    .select()
    .single();

  if (error) {
    console.error("Error inserting new artist profile:", error);
    throw new Error(`Falha ao salvar perfil: ${error.message}`);
  }
  
  return data as UserProfile;
};

export const updateArtistProfile = async (id: string, profileData: Partial<Omit<UserProfile, 'id' | 'created_at' | 'bloc' | 'admin'>>): Promise<UserProfile> => {
  console.log("Attempting to update profile with ID:", id);
  console.log("Payload:", profileData);
  
  const { data, error } = await supabase
    .from("user")
    .update(profileData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating artist profile ${id}:`, error);
    throw new Error(`Falha ao atualizar perfil: ${error.message}`);
  }
  
  return data as UserProfile;
};

export const fetchObras = async (): Promise<Obra[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return []; // Se não estiver logado, não retorna nenhuma obra
  }

  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .eq("user_id", user.id) // Filtra pelo ID do usuário logado
    .order("data_criacao", { ascending: false });

  if (error) {
    console.error("Error fetching user's obras:", error);
    return [];
  }
  
  return data as Obra[];
};

export const fetchObraById = async (id: string): Promise<Obra | null> => {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching obra ${id}:`, error);
    return null;
  }
  
  return data as Obra;
};

export const insertNewObra = async (obraData: Omit<Obra, 'id' | 'created_at'>): Promise<Obra | null> => {
  if (!obraData.user_id) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      obraData.user_id = user.id;
    }
  }

  const { data, error } = await supabase
    .from("obras")
    .insert([obraData])
    .select()
    .single();

  if (error) {
    console.error("Error inserting new obra:", error);
    throw new Error(`Falha ao salvar dados da obra: ${error.message}`);
  }
  
  return data as Obra;
};

export const fetchGalleryImagesByObraId = async (obraId: string): Promise<Img[]> => {
  const { data, error } = await supabase
    .from("imgs")
    .select("*")
    .eq("obras_id", obraId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(`Error fetching gallery images for obra ${obraId}:`, error);
    return [];
  }
  
  return data as Img[];
};

export const insertGalleryImage = async (imageData: InsertImg): Promise<Img> => {
  const { data, error } = await supabase
    .from("imgs")
    .insert([imageData])
    .select()
    .single();

  if (error) {
    console.error("Error inserting gallery image:", error);
    throw new Error(`Falha ao salvar imagem na galeria: ${error.message}`);
  }
  
  return data as Img;
};

export const uploadAndAddToGallery = async (file: File, obraId: string): Promise<Img> => {
  const filePath = await uploadFile(file, "gallery");
  
  if (!filePath) {
    throw new Error("Falha ao fazer upload da imagem.");
  }

  return insertGalleryImage({
    obras_id: obraId,
    url: filePath,
  });
};

export const deleteGalleryImage = async (imageId: string, imagePath: string): Promise<void> => {
  const { error: storageError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([imagePath]);

  if (storageError) {
    console.warn("Error deleting file from storage:", storageError);
  }

  const { error: dbError } = await supabase
    .from("imgs")
    .delete()
    .eq("id", imageId);

  if (dbError) {
    console.error(`Error deleting gallery image ${imageId}:`, dbError);
    throw new Error(`Falha ao deletar imagem da galeria: ${dbError.message}`);
  }
};
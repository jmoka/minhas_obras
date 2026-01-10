import { supabase } from "./client";
import { Obra, UserProfile } from "@/types/database";

const BUCKET_NAME = "art_gallery";

// --- Storage Utilities ---

/**
 * Gets the public URL for a file stored in Supabase Storage.
 * @param path The path/UUID of the file in the storage bucket.
 * @returns The public URL string.
 */
export const getPublicUrl = (path: string | null): string => {
  if (!path) return "/placeholder.svg"; // Use a fallback placeholder
  
  // Supabase storage paths are usually relative to the bucket root.
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Uploads a file to Supabase Storage and returns the file path (UUID).
 * @param file The file object to upload.
 * @param folder The subfolder in the bucket (e.g., 'images', 'videos', 'avatars').
 * @returns The path of the uploaded file (which is often the UUID).
 */
export const uploadFile = async (file: File, folder: string): Promise<string | null> => {
  if (!file) return null;
  
  const fileExtension = file.name.split('.').pop();
  const fileName = `${crypto.randomUUID()}.${fileExtension}`;
  const filePath = `${folder}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file);

  if (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file.");
  }

  // We return the path used for storage, which is what we save in the DB.
  return filePath;
};


// --- Data Fetching & Management ---

/**
 * Fetches the artist profile (assuming we only care about the first entry for display).
 */
export const fetchArtistProfile = async (): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from("user")
    .select("*")
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
    console.error("Error fetching artist profile:", error);
    return null;
  }
  
  return data as UserProfile | null;
};

/**
 * Inserts a new artist profile record.
 */
export const insertArtistProfile = async (profileData: Omit<UserProfile, 'id' | 'created_at' | 'bloc'>): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("user")
    .insert([profileData])
    .select()
    .single();

  if (error) {
    console.error("Error inserting new artist profile:", error);
    throw new Error("Failed to save artist profile data.");
  }
  
  return data as UserProfile;
};

/**
 * Updates an existing artist profile record.
 */
export const updateArtistProfile = async (id: number, profileData: Partial<Omit<UserProfile, 'id' | 'created_at' | 'bloc'>>): Promise<UserProfile> => {
  const { data, error } = await supabase
    .from("user")
    .update(profileData)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`Error updating artist profile ${id}:`, error);
    throw new Error("Failed to update artist profile data.");
  }
  
  return data as UserProfile;
};


/**
 * Fetches all art works (obras).
 */
export const fetchObras = async (): Promise<Obra[]> => {
  const { data, error } = await supabase
    .from("obras")
    .select("*")
    .order("data_criacao", { ascending: false });

  if (error) {
    console.error("Error fetching obras:", error);
    return [];
  }
  
  return data as Obra[];
};

/**
 * Fetches a single art work by ID.
 */
export const fetchObraById = async (id: number): Promise<Obra | null> => {
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

/**
 * Inserts a new art work record.
 */
export const insertNewObra = async (obraData: Omit<Obra, 'id' | 'created_at'>): Promise<Obra | null> => {
  const { data, error } = await supabase
    .from("obras")
    .insert([obraData])
    .select()
    .single();

  if (error) {
    console.error("Error inserting new obra:", error);
    throw new Error("Failed to save artwork data.");
  }
  
  return data as Obra;
};
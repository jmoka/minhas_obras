import { supabase } from "./client";
import { Obra, UserProfile, Img, InsertImg, SiteVisit, ObraView, GeoLocationData } from "@/types/database";

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

export const fetchAllPublicObras = async (): Promise<Obra[]> => {
  const { data, error } = await supabase
    .from("obras")
    .select("*, user(id, nome, foto)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all public obras:", error);
    return [];
  }
  
  return data as Obra[];
};

export const fetchAllArtists = async (): Promise<UserProfile[]> => {
  const { data, error } = await supabase
    .from("user")
    .select("*")
    .order("nome", { ascending: true });

  if (error) {
    console.error("Error fetching all artists:", error);
    return [];
  }
  
  return data as UserProfile[];
};

export const fetchObras = async (): Promise<Obra[]> => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return []; // Se não estiver logado, não retorna nenhuma obra
  }

  const { data, error } = await supabase
    .from("obras")
    .select("*, user(id, nome, foto)")
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
    .select("*, user(id, nome, foto)")
    .eq("id", id)
    .single();

  if (error) {
    console.error(`Error fetching obra ${id}:`, error);
    return null;
  }
  
  return data as Obra;
};

export const insertNewObra = async (obraData: Omit<Obra, 'id' | 'created_at' | 'user'>): Promise<Obra | null> => {
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

export const recordSiteVisit = async (
  sessionId: string,
  geoData: GeoLocationData
): Promise<SiteVisit | null> => {
  try {
    const { data, error } = await supabase
      .from("site_visits")
      .insert([{
        session_id: sessionId,
        ip_address: geoData.ip,
        country: geoData.country,
        city: geoData.city,
        duration_seconds: 0,
      }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao registrar visita ao site:", error);
      return null;
    }

    return data as SiteVisit;
  } catch (error) {
    console.error("Erro ao registrar visita:", error);
    return null;
  }
};

export const updateVisitDuration = async (
  sessionId: string,
  durationSeconds: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("site_visits")
      .update({ duration_seconds: durationSeconds })
      .eq("session_id", sessionId);

    if (error) {
      console.error("Erro ao atualizar duração da visita:", error);
    }
  } catch (error) {
    console.error("Erro ao atualizar duração:", error);
  }
};

export const recordObraView = async (
  obraId: string,
  sessionId: string,
  geoData: GeoLocationData
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from("obra_views")
      .insert([{
        obra_id: parseInt(obraId),
        session_id: sessionId,
        ip_address: geoData.ip,
        country: geoData.country,
        city: geoData.city,
        duration_seconds: 0,
      }])
      .select()
      .single();

    if (error) {
      console.error("Erro ao registrar visualização de obra:", error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error("Erro ao registrar visualização:", error);
    return null;
  }
};

export const getObraViewCount = async (obraId: string): Promise<number> => {
  try {
    const { count, error } = await supabase
      .from("obra_views")
      .select("*", { count: "exact", head: true })
      .eq("obra_id", parseInt(obraId));

    if (error) {
      console.error("Erro ao buscar contagem de views:", error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error("Erro ao buscar contagem:", error);
    return 0;
  }
};

export const updateObraViewDuration = async (
  viewId: string,
  durationSeconds: number
): Promise<void> => {
  try {
    const { error } = await supabase
      .from("obra_views")
      .update({ duration_seconds: durationSeconds })
      .eq("id", viewId);

    if (error) {
      console.error("Erro ao atualizar duração da visualização:", error);
    }
  } catch (error) {
    console.error("Erro ao atualizar duração:", error);
  }
};

export const getAnalyticsStats = async () => {
  try {
    const { count: totalVisits } = await supabase
      .from("site_visits")
      .select("*", { count: "exact", head: true });

    const { data: uniqueIPs } = await supabase
      .from("site_visits")
      .select("ip_address");
    
    const uniqueVisitors = new Set(uniqueIPs?.map(v => v.ip_address)).size;

    const { count: totalObraViews } = await supabase
      .from("obra_views")
      .select("*", { count: "exact", head: true });

    const { data: avgDurationData } = await supabase
      .from("site_visits")
      .select("duration_seconds");
    
    const avgDuration = avgDurationData && avgDurationData.length > 0
      ? Math.round(avgDurationData.reduce((sum, v) => sum + (v.duration_seconds || 0), 0) / avgDurationData.length)
      : 0;

    const { data: topObras } = await supabase
      .from("obra_views")
      .select("obra_id, obras(id, titulo, img)")
      .limit(1000);

    const obraViewCounts = topObras?.reduce((acc: any, view: any) => {
      const id = view.obra_id;
      if (!acc[id]) {
        acc[id] = {
          obra: view.obras,
          count: 0
        };
      }
      acc[id].count++;
      return acc;
    }, {});

    const topObrasList = Object.values(obraViewCounts || {})
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    const { data: countryData } = await supabase
      .from("site_visits")
      .select("country");

    const countryCounts = countryData?.reduce((acc: any, v) => {
      const country = v.country || "Desconhecido";
      acc[country] = (acc[country] || 0) + 1;
      return acc;
    }, {});

    const topCountries = Object.entries(countryCounts || {})
      .map(([country, count]) => ({ country, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    return {
      totalVisits: totalVisits || 0,
      uniqueVisitors,
      totalObraViews: totalObraViews || 0,
      avgDuration,
      topObras: topObrasList,
      topCountries,
    };
  } catch (error) {
    console.error("Erro ao buscar estatísticas:", error);
    return {
      totalVisits: 0,
      uniqueVisitors: 0,
      totalObraViews: 0,
      avgDuration: 0,
      topObras: [],
      topCountries: [],
    };
  }
};

export const getArtistAnalytics = async (userId: string) => {
  try {
    const { data: userObras } = await supabase
      .from("obras")
      .select("id")
      .eq("user_id", userId);

    const obraIds = userObras?.map(o => parseInt(o.id)) || [];

    if (obraIds.length === 0) {
      return {
        totalViews: 0,
        topObra: null,
        topLocations: [],
        viewDetails: [],
      };
    }

    const { data: allViews } = await supabase
      .from("obra_views")
      .select("obra_id, ip_address, country, city, created_at, obras(id, titulo, img)")
      .in("obra_id", obraIds)
      .order("created_at", { ascending: false });

    const totalViews = allViews?.length || 0;

    const obraViewCounts = allViews?.reduce((acc: any, view: any) => {
      const id = view.obra_id;
      if (!acc[id]) {
        acc[id] = {
          obra: view.obras,
          count: 0
        };
      }
      acc[id].count++;
      return acc;
    }, {});

    const topObra = obraViewCounts
      ? Object.values(obraViewCounts).sort((a: any, b: any) => b.count - a.count)[0]
      : null;

    const locationCounts = allViews?.reduce((acc: any, view) => {
      const location = view.city && view.country 
        ? `${view.city}, ${view.country}`
        : view.country || "Desconhecido";
      acc[location] = (acc[location] || 0) + 1;
      return acc;
    }, {});

    const topLocations = Object.entries(locationCounts || {})
      .map(([location, count]) => ({ location, count }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 3);

    const viewDetails = allViews?.map(view => ({
      obra: view.obras,
      ip: view.ip_address,
      location: view.city && view.country 
        ? `${view.city}, ${view.country}`
        : view.country || "Desconhecido",
      date: view.created_at,
    })) || [];

    return {
      totalViews,
      topObra,
      topLocations,
      viewDetails,
    };
  } catch (error) {
    console.error("Erro ao buscar analytics do artista:", error);
    return {
      totalViews: 0,
      topObra: null,
      topLocations: [],
      viewDetails: [],
    };
  }
};
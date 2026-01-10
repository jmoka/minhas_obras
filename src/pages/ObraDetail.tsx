import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchObraById, getPublicUrl } from "@/integrations/supabase/api";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Video, User, Image } from "lucide-react";
import GalleryManager from "@/components/GalleryManager";

const ObraDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const obraId = id;

  const { data: obra, isLoading, error } = useQuery({
    queryKey: ["obra", obraId],
    queryFn: () => {
      if (!obraId) {
        throw new Error("Invalid artwork ID.");
      }
      return fetchObraById(obraId);
    },
    enabled: !!obraId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-3/4" />
        <div className="grid md:grid-cols-3 gap-8">
          <Skeleton className="md:col-span-2 h-[500px]" />
          <div className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !obra) {
    return <div className="text-center text-red-500">Obra de arte não encontrada ou ID inválido.</div>;
  }

  const imageUrl = getPublicUrl(obra.img);
  const videoUrl = obra.video ? getPublicUrl(obra.video) : null;
  const ownerPhotoUrl = getPublicUrl(obra.foto_dono);
  const creationDate = obra.data_criacao ? new Date(obra.data_criacao).toLocaleDateString('pt-BR') : 'Data Desconhecida';
  
  // Comparação de IDs como strings (UUID direto)
  const isOwner = currentUser && obra.user_id && currentUser.id === obra.user_id;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <h1 className="text-4xl font-serif font-bold border-b pb-4">{obra.titulo}</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Media */}
        <div className="md:col-span-2">
          <Card className="p-2">
            {obra.img ? (
              <img 
                src={imageUrl} 
                alt={obra.titulo || "Obra de Arte"} 
                className="w-full h-auto object-contain max-h-[70vh] rounded-lg" 
              />
            ) : (
              <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-900 flex items-center justify-center rounded-lg">
                <Image className="h-16 w-16 text-gray-400" />
              </div>
            )}
          </Card>
          
          {videoUrl && (
            <Card className="mt-4 p-4">
              <h2 className="text-xl font-semibold flex items-center mb-2"><Video className="h-5 w-5 mr-2" /> Vídeo da Obra</h2>
              <video controls src={videoUrl} className="w-full rounded-lg" />
            </Card>
          )}
        </div>

        {/* Details and Owner */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Detalhes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 mr-2" />
                Data de Criação: <span className="ml-2 font-medium text-foreground">{creationDate}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Proprietário</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center space-x-4">
              {obra.foto_dono ? (
                <img 
                  src={ownerPhotoUrl} 
                  alt={obra.nome_dono || "Dono"} 
                  className="w-16 h-16 rounded-full object-cover border-2 border-accent" 
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                  <User className="h-8 w-8 text-secondary-foreground" />
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">{obra.nome_dono || "Proprietário Desconhecido"}</p>
                <p className="text-sm text-muted-foreground">Coleção Particular</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {obraId && <GalleryManager obraId={obraId} isOwner={!!isOwner} />}
    </div>
  );
};

export default ObraDetail;
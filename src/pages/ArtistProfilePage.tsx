import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchArtistProfile, getPublicUrl } from "@/integrations/supabase/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User } from "lucide-react";

const ArtistProfilePage: React.FC = () => {
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["artistProfile"],
    queryFn: fetchArtistProfile,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="flex items-center space-x-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !profile) {
    return <div className="text-center text-red-500">Failed to load artist profile. Please ensure the 'user' table has data.</div>;
  }

  const avatarUrl = profile.foto ? getPublicUrl(profile.foto) : "/placeholder.svg";

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-serif">{profile.nome || "Artista Desconhecido"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            {profile.foto ? (
              <img
                src={avatarUrl}
                alt={profile.nome || "Artist Avatar"}
                className="w-24 h-24 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="h-12 w-12 text-gray-500" />
              </div>
            )}
            <div>
              <p className="text-lg font-medium">{profile.nome}</p>
              <p className="text-sm text-muted-foreground">Membro desde: {new Date(profile.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          
          <section>
            <h2 className="text-xl font-semibold mb-2">Biografia</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {profile.descricao || "Nenhuma descrição fornecida."}
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default ArtistProfilePage;
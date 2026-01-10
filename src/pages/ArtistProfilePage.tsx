import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchArtistProfile, getPublicUrl } from "@/integrations/supabase/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProfileForm from "@/components/ProfileForm";
import { supabase } from "@/integrations/supabase/client";

const ArtistProfilePage: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["artistProfile"],
    queryFn: fetchArtistProfile,
  });

  // Fetch current auth user for UUID access
  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

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

  if (error) {
    return <div className="text-center text-red-500">Erro ao carregar o perfil do artista.</div>;
  }

  // If no profile exists, force editing mode (creation mode)
  if (!profile && !isEditing) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-serif">Cadastrar Perfil de Artista</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-muted-foreground">Parece que você ainda não tem um perfil cadastrado. Use o formulário abaixo para criar um.</p>
            <ProfileForm initialProfile={null} onSave={() => setIsEditing(false)} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-3xl font-serif">Editar Perfil</CardTitle>
            <Button variant="outline" onClick={handleEditToggle}>
              Cancelar
            </Button>
          </CardHeader>
          <CardContent>
            <ProfileForm initialProfile={profile} onSave={handleEditToggle} />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Display Mode
  const avatarUrl = profile?.foto ? getPublicUrl(profile.foto) : "/placeholder.svg";

  return (
    <div className="max-w-3xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-3xl font-serif">{profile?.nome || "Artista Desconhecido"}</CardTitle>
          <Button variant="outline" onClick={handleEditToggle} size="icon">
            <Edit className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-6">
            {profile?.foto ? (
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
              <p className="text-lg font-medium">{profile?.nome}</p>
              <p className="text-sm text-muted-foreground">Membro desde: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
          
          <section>
            <h2 className="text-xl font-semibold mb-2">Biografia</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {profile?.descricao || "Nenhuma descrição fornecida."}
            </p>
          </section>
        </CardContent>
        
        {/* DEBUG SECTION */}
        {currentUser && profile && (
          <CardContent className="pt-0 border-t mt-6">
            <h3 className="text-lg font-semibold mt-4 mb-2 text-muted-foreground">Debug IDs (Para Diagnóstico)</h3>
            <p className="text-sm">
              <span className="font-mono text-xs block">Auth UUID: {currentUser.id}</span>
              <span className="font-mono text-xs block">Profile ID (DB): {profile.id}</span>
              {currentUser.id === profile.id ? (
                <span className="text-green-600 text-xs font-bold">✅ IDs Coincidem</span>
              ) : (
                <span className="text-red-600 text-xs font-bold">❌ IDs NÃO Coincidem!</span>
              )}
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default ArtistProfilePage;
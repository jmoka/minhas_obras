import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllPublicObras, fetchAllArtists, getPublicUrl } from "@/integrations/supabase/api";
import ObraCard from "@/components/ObraCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Palette } from "lucide-react";
import { Card } from "@/components/ui/card";

const PublicGallery: React.FC = () => {
  const { data: obras, isLoading: isLoadingObras } = useQuery({
    queryKey: ["publicObras"],
    queryFn: fetchAllPublicObras,
  });

  const { data: artists, isLoading: isLoadingArtists } = useQuery({
    queryKey: ["allArtists"],
    queryFn: fetchAllArtists,
  });

  const isLoading = isLoadingObras || isLoadingArtists;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center p-8 rounded-lg bg-gradient-to-br from-teal-50 via-amber-50 to-orange-50">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">
          Explore a Arte
        </h1>
        <p className="mt-4 text-lg text-stone-600 max-w-2xl mx-auto">
          Navegue por uma coleção diversificada de obras e descubra o talento de nossos artistas.
        </p>
      </div>

      {/* Artists Section */}
      <section>
        <h2 className="text-3xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-3">
          <User className="w-8 h-8 text-teal-600" />
          Nossos Artistas
        </h2>
        {isLoading ? (
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-24 rounded-full" />
            ))}
          </div>
        ) : (
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {artists?.map((artist) => (
              <Link to={`/artist/${artist.id}`} key={artist.id} className="text-center group">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg group-hover:border-teal-400 transition-colors">
                  <AvatarImage src={getPublicUrl(artist.foto)} alt={artist.nome || "Artista"} />
                  <AvatarFallback>
                    <User className="h-10 w-10 text-stone-400" />
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm font-medium text-stone-700 group-hover:text-teal-700 transition-colors truncate w-24">
                  {artist.nome || "Anônimo"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Artworks Section */}
      <section>
        <h2 className="text-3xl font-serif font-bold text-stone-800 mb-6 flex items-center gap-3">
          <Palette className="w-8 h-8 text-amber-600" />
          Galeria de Obras
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
            ))}
          </div>
        ) : !obras || obras.length === 0 ? (
          <Card className="text-center p-12 bg-stone-50">
            <p className="text-stone-500">Nenhuma obra de arte encontrada na galeria.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {obras.map((obra) => (
              <ObraCard key={obra.id} obra={obra} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicGallery;
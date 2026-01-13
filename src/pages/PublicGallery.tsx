import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllPublicObras, fetchAllArtists, getPublicUrl } from "@/integrations/supabase/api";
import ObraCard from "@/components/ObraCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Palette, Search, X as XIcon, Shield, Heart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PublicGallery: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArtist, setSelectedArtist] = useState("all");

  const { data: obras, isLoading: isLoadingObras } = useQuery({
    queryKey: ["publicObras"],
    queryFn: fetchAllPublicObras,
  });

  const { data: artists, isLoading: isLoadingArtists } = useQuery({
    queryKey: ["allArtists"],
    queryFn: fetchAllArtists,
  });

  const isLoading = isLoadingObras || isLoadingArtists;

  const filteredObras = useMemo(() => {
    if (!obras) return [];
    return obras.filter((obra) => {
      const matchesSearch = obra.titulo?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesArtist = selectedArtist === "all" || obra.user_id === selectedArtist;
      return matchesSearch && matchesArtist;
    });
  }, [obras, searchTerm, selectedArtist]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedArtist("all");
  };

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
        <Link to="/donate">
          <Button className="mt-6 bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg hover:shadow-xl transition-shadow">
            <Heart className="mr-2 h-4 w-4" />
            Apoie a Plataforma
          </Button>
        </Link>
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
                <div className="relative">
                  <Avatar className="h-24 w-24 border-4 border-white shadow-lg group-hover:border-teal-400 transition-colors">
                    <AvatarImage src={getPublicUrl(artist.foto)} alt={artist.nome || "Artista"} />
                    <AvatarFallback>
                      <User className="h-10 w-10 text-stone-400" />
                    </AvatarFallback>
                  </Avatar>
                  {artist.admin && (
                    <Badge 
                      variant="default" 
                      className="absolute -top-1 -right-1 h-7 w-7 rounded-full p-0 flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600 border-2 border-white shadow-md"
                      title="Administrador"
                    >
                      <Shield className="h-4 w-4 text-white" />
                    </Badge>
                  )}
                </div>
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-3xl font-serif font-bold text-stone-800 flex items-center gap-3 shrink-0">
            <Palette className="w-8 h-8 text-amber-600" />
            Galeria de Obras
          </h2>
          
          {/* Filters */}
          <div className="w-full md:w-auto flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por título..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
            <Select value={selectedArtist} onValueChange={setSelectedArtist}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por artista" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Artistas</SelectItem>
                {artists?.filter(artist => artist.nome).map((artist) => (
                  <SelectItem key={artist.id} value={artist.id}>
                    {artist.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(searchTerm || selectedArtist !== 'all') && (
              <Button variant="ghost" onClick={handleClearFilters}>
                <XIcon className="h-4 w-4 mr-2" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
            ))}
          </div>
        ) : filteredObras.length === 0 ? (
          <Card className="text-center p-12 bg-stone-50 col-span-full">
            <p className="text-stone-500">Nenhuma obra encontrada com os filtros selecionados.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredObras.map((obra) => (
              <ObraCard key={obra.id} obra={obra} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default PublicGallery;
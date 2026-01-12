import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getPublicUrl, getArtistAnalytics } from "@/integrations/supabase/api";
import { UserProfile, Obra } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Palette, Image, Mail, MessageCircle, Eye, TrendingUp, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const ArtistPublicPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const { data: artist, isLoading: loadingArtist } = useQuery({
    queryKey: ["artist", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching artist:", error);
        throw new Error("Artista não encontrado");
      }

      return data as UserProfile;
    },
    enabled: !!userId,
  });

  const { data: obras = [], isLoading: loadingObras } = useQuery({
    queryKey: ["artist-obras", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("*")
        .eq("user_id", userId)
        .order("data_criacao", { ascending: false });

      if (error) {
        console.error("Error fetching artist obras:", error);
        return [];
      }

      return data as Obra[];
    },
    enabled: !!userId,
  });

  const { data: analytics } = useQuery({
    queryKey: ["artist-analytics", userId],
    queryFn: () => getArtistAnalytics(userId!),
    enabled: !!userId,
  });

  if (loadingArtist) {
    return (
      <div className="space-y-8">
        <div className="relative h-96 bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 rounded-3xl overflow-hidden">
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Skeleton className="w-48 h-48 rounded-full mb-6" />
            <Skeleton className="w-64 h-12 mb-4" />
            <Skeleton className="w-48 h-6" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="text-center py-20">
        <h1 className="text-4xl font-serif font-light text-gray-800 mb-4">Artista não encontrado</h1>
        <p className="text-gray-600">O perfil que você está procurando não existe.</p>
        <Link to="/" className="mt-6 inline-block text-purple-600 hover:text-purple-800 font-medium">
          Voltar para a galeria
        </Link>
      </div>
    );
  }

  const memberSince = new Date(artist.created_at).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative h-96 bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
          <div className="relative mb-6 group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity" />
            <img
              src={getPublicUrl(artist.foto)}
              alt={artist.nome || "Artista"}
              className="relative w-48 h-48 rounded-full object-cover border-8 border-white shadow-2xl transform group-hover:scale-105 transition-transform duration-300"
            />
          </div>
          <h1 className="text-5xl font-serif font-bold mb-3 tracking-tight drop-shadow-lg">
            {artist.nome || "Artista Anônimo"}
          </h1>
          <div className="flex items-center gap-2 text-white/90 text-lg">
            <Palette className="w-5 h-5" />
            <span>Artista Visual</span>
          </div>
          
          {/* Contact Buttons */}
          {(artist.email || artist.whatsapp) && (
            <div className="flex items-center gap-4 mt-6">
              {artist.email && (
                <Button
                  asChild
                  className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-2 border-white/50 shadow-lg transition-all"
                >
                  <a href={`mailto:${artist.email}`} target="_blank" rel="noopener noreferrer">
                    <Mail className="w-5 h-5 mr-2" />
                    Email
                  </a>
                </Button>
              )}
              {artist.whatsapp && (
                <Button
                  asChild
                  className="bg-green-500/90 hover:bg-green-600 text-white border-2 border-white/50 shadow-lg transition-all"
                >
                  <a 
                    href={`https://wa.me/${artist.whatsapp.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 -mt-20 relative z-20 px-4">
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-8 border-0 hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-4 rounded-2xl">
              <Image className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                {obras.length}
              </p>
              <p className="text-gray-600 font-medium">
                {obras.length === 1 ? "Obra" : "Obras"} de Arte
              </p>
            </div>
          </div>
        </Card>

        <Card className="bg-white/95 backdrop-blur-sm shadow-xl rounded-2xl p-8 border-0 hover:shadow-2xl transition-shadow">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-orange-500 to-pink-500 p-4 rounded-2xl">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800 capitalize">{memberSince}</p>
              <p className="text-gray-600 font-medium">Membro desde</p>
            </div>
          </div>
        </Card>
      </div>

      {/* About Section */}
      {artist.descricao && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-10 shadow-lg">
          <h2 className="text-3xl font-serif font-bold text-gray-800 mb-6 flex items-center gap-3">
            <Palette className="w-8 h-8 text-purple-600" />
            Sobre o Artista
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-wrap">
            {artist.descricao}
          </p>
        </div>
      )}

      {/* Analytics Section */}
      {analytics && analytics.totalViews > 0 && (
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 rounded-3xl p-10 shadow-lg">
          <h2 className="text-3xl font-serif font-bold text-gray-800 mb-6 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-teal-600" />
            Métricas do Artista
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-teal-700 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Total de Visualizações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-teal-900">{analytics.totalViews}</div>
              </CardContent>
            </Card>

            {analytics.topObra && (
              <Card className="border-none shadow-md">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Obra Mais Vista
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to={`/obras/${analytics.topObra.obra.id}`} className="hover:underline">
                    <p className="font-bold text-purple-900 truncate">{analytics.topObra.obra.titulo}</p>
                    <p className="text-sm text-gray-600">{analytics.topObra.count} visualizações</p>
                  </Link>
                </CardContent>
              </Card>
            )}

            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Top 3 Localidades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {analytics.topLocations.slice(0, 3).map((loc: any, idx: number) => (
                    <p key={idx} className="text-sm text-gray-700">
                      {idx + 1}. {loc.location} ({loc.count})
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Collapsible open={isAnalyticsOpen} onOpenChange={setIsAnalyticsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full flex items-center justify-center gap-2">
                {isAnalyticsOpen ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Ocultar Detalhes das Visualizações
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Ver Detalhes das Visualizações
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-6">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analytics.viewDetails.map((detail: any, idx: number) => (
                  <Card key={idx} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                          {detail.obra?.img ? (
                            <img
                              src={getPublicUrl(detail.obra.img)}
                              alt={detail.obra.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Image className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <p className="font-medium text-gray-900">{detail.obra?.titulo || "Sem título"}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {detail.location}
                            </span>
                            <span>IP: {detail.ip.substring(0, 10)}...</span>
                            <span>{new Date(detail.date).toLocaleDateString("pt-BR")}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Portfolio Grid */}
      <div>
        <h2 className="text-4xl font-serif font-bold text-gray-800 mb-8 pb-4 border-b-2 border-gradient-to-r from-purple-300 to-pink-300">
          Portfólio
        </h2>

        {loadingObras ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96 w-full rounded-2xl" />
            ))}
          </div>
        ) : obras.length === 0 ? (
          <div className="text-center py-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl">
            <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-serif text-gray-600 mb-2">Nenhuma obra ainda</h3>
            <p className="text-gray-500">Este artista ainda não publicou obras.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {obras.map((obra) => (
              <Link
                key={obra.id}
                to={`/obras/${obra.id}`}
                className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <Card className="border-0 overflow-hidden h-full">
                  <div className="relative h-80 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                    <img
                      src={getPublicUrl(obra.img)}
                      alt={obra.titulo || "Obra"}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-2xl font-serif font-bold mb-2 drop-shadow-lg">
                        {obra.titulo || "Sem título"}
                      </h3>
                      {obra.data_criacao && (
                        <p className="text-sm text-white/90 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {new Date(obra.data_criacao).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ArtistPublicPage;
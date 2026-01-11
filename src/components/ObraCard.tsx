import React from "react";
import { Link } from "react-router-dom";
import { Obra } from "@/types/database";
import { getPublicUrl } from "@/integrations/supabase/api";
import { Image, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ObraCardProps {
  obra: Obra;
}

const ObraCard: React.FC<ObraCardProps> = ({ obra }) => {
  const imageUrl = getPublicUrl(obra.img);
  const artistPhotoUrl = getPublicUrl(obra.user?.foto);
  const ownerPhotoUrl = getPublicUrl(obra.foto_dono);
  
  const creationDate = obra.data_criacao ? new Date(obra.data_criacao).toLocaleDateString('pt-BR') : 'Data Desconhecida';

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition duration-300 ease-in-out bg-card h-full flex flex-col group">
      {/* Image Area */}
      <Link to={`/obras/${obra.id}`} className="block overflow-hidden">
        <div className="w-full h-64 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative">
          {obra.img ? (
            <img 
              src={imageUrl} 
              alt={obra.titulo || "Obra de Arte"} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
              loading="lazy"
            />
          ) : (
            <Image className="h-12 w-12 text-gray-400" />
          )}
        </div>
      </Link>
      
      {/* Details */}
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/obras/${obra.id}`} className="block">
          <h3 className="text-xl font-serif font-bold mb-1 truncate">{obra.titulo || "Sem Título"}</h3>
          <p className="text-sm text-muted-foreground mb-4">Criada em: {creationDate}</p>
        </Link>
        
        {/* Artist & Owner Info */}
        <div className="mt-auto pt-4 border-t">
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2">
            {/* Artist Info */}
            {obra.user && (
              <Link to={`/artist/${obra.user.id}`} className="flex items-center space-x-3 group/artist">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={artistPhotoUrl} alt={obra.user.nome || "Artista"} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Artista</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover/artist:text-teal-600 transition-colors">
                    {obra.user.nome || "Artista Desconhecido"}
                  </p>
                </div>
              </Link>
            )}
            
            {/* Owner Info */}
            {obra.nome_dono && (
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={ownerPhotoUrl} alt={obra.nome_dono || "Proprietário"} />
                  <AvatarFallback>
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-muted-foreground">Proprietário</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {obra.nome_dono}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ObraCard;
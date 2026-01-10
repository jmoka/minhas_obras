import React from "react";
import { Link } from "react-router-dom";
import { Obra } from "@/types/database";
import { getPublicUrl } from "@/integrations/supabase/api";
import { Image, User } from "lucide-react";

interface ObraCardProps {
  obra: Obra;
}

const ObraCard: React.FC<ObraCardProps> = ({ obra }) => {
  const imageUrl = getPublicUrl(obra.img);
  const ownerPhotoUrl = getPublicUrl(obra.foto_dono);
  
  const creationDate = obra.data_criacao ? new Date(obra.data_criacao).toLocaleDateString('pt-BR') : 'Data Desconhecida';

  return (
    <Link to={`/obras/${obra.id}`} className="block">
      <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition duration-300 ease-in-out bg-card h-full flex flex-col">
        
        {/* Image Area */}
        <div className="w-full h-64 bg-gray-100 dark:bg-gray-900 flex items-center justify-center relative">
          {obra.img ? (
            <img 
              src={imageUrl} 
              alt={obra.titulo || "Obra de Arte"} 
              className="w-full h-full object-cover" 
              loading="lazy"
            />
          ) : (
            <Image className="h-12 w-12 text-gray-400" />
          )}
        </div>
        
        {/* Details */}
        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-xl font-serif font-bold mb-1 truncate">{obra.titulo || "Sem Título"}</h3>
          <p className="text-sm text-muted-foreground mb-4">Criada em: {creationDate}</p>
          
          {/* Owner Info */}
          <div className="mt-auto pt-2 border-t flex items-center">
            {obra.foto_dono ? (
              <img 
                src={ownerPhotoUrl} 
                alt={obra.nome_dono || "Dono"} 
                className="w-8 h-8 rounded-full object-cover mr-2" 
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center mr-2">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
            <span className="text-sm italic text-gray-700 dark:text-gray-300 truncate">
              Coleção de: {obra.nome_dono || "Proprietário Desconhecido"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ObraCard;
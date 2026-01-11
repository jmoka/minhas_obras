import React from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchObras } from "@/integrations/supabase/api";
import ObraCard from "@/components/ObraCard";
import { Skeleton } from "@/components/ui/skeleton";

const Index: React.FC = () => {
  const { data: obras, isLoading, error } = useQuery({
    queryKey: ["obras"],
    queryFn: fetchObras,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] p-4 md:p-8 space-y-8">
        <div className="flex items-center gap-4 mb-6 border-b-4 border-amber-400/30 pb-6">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Erro ao carregar as obras.</div>;
  }
  
  if (!obras || obras.length === 0) {
    return (
      <div className="min-h-screen bg-[#fcfbf9] p-4 md:p-8 text-center">
        <div className="flex justify-center mb-6">
           <img src="/logo.png" alt="Logo" className="h-20 w-auto" />
        </div>
        <h1 className="text-3xl font-serif mb-4 text-teal-800">Galeria Vazia</h1>
        <p className="text-lg text-muted-foreground">Nenhuma obra de arte encontrada. Adicione uma nova obra através do painel 'Add Art'.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row items-center gap-4 border-b-4 border-amber-400/30 pb-6">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">
          Galeria de Arte 
            </h1>
          <span className="text-xl md:text-3xl text-stone-500 font-normal ml-2">({obras.length} Obras)</span>
        
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {obras.map((obra) => (
          <ObraCard key={obra.id} obra={obra} />
        ))}
      </div>
    </div>
  );
};

export default Index;
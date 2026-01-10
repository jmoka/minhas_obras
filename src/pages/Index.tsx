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
      <div className="space-y-6">
        <h1 className="text-4xl font-serif font-light mb-6">Galeria de Arte</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-[400px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">Erro ao carregar as obras.</div>;
  }
  
  if (!obras || obras.length === 0) {
    return (
      <div className="text-center p-10">
        <h1 className="text-3xl font-serif mb-4">Galeria Vazia</h1>
        <p className="text-lg text-muted-foreground">Nenhuma obra de arte encontrada. Adicione uma nova obra através do painel 'Add Art'.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-serif font-light border-b pb-4">Galeria de Arte ({obras.length} Obras)</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {obras.map((obra) => (
          <ObraCard key={obra.id} obra={obra} />
        ))}
      </div>
    </div>
  );
};

export default Index;
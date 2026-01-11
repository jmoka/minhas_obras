import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchObras } from "@/integrations/supabase/api";
import ObraCard from "@/components/ObraCard";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsAuthLoading(false);
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: obras, isLoading, error } = useQuery({
    queryKey: ["obras", isAuthenticated], // Reexecuta a query quando o status de autenticação muda
    queryFn: fetchObras,
    enabled: !isAuthLoading, // Só busca os dados após verificar a autenticação
  });

  if (isLoading || isAuthLoading) {
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
    if (isAuthenticated) {
      return (
        <div className="min-h-screen bg-[#fcfbf9] p-4 md:p-8 text-center flex flex-col items-center justify-center">
          <img src="/logo.png" alt="Logo" className="h-20 w-auto mb-6" />
          <h1 className="text-3xl font-serif mb-4 text-teal-800">Sua Galeria Pessoal está Vazia</h1>
          <p className="text-lg text-muted-foreground max-w-md">Você ainda não adicionou nenhuma obra. Clique no botão abaixo para começar a construir sua coleção.</p>
          <Link to="/admin/new-obra">
            <Button className="mt-6 bg-gradient-to-r from-teal-600 to-teal-500 text-white">Adicionar Nova Obra</Button>
          </Link>
        </div>
      );
    } else {
      return (
        <div className="min-h-screen bg-[#fcfbf9] p-4 md:p-8 text-center flex flex-col items-center justify-center">
          <img src="/logo.png" alt="Logo" className="h-20 w-auto mb-6" />
          <h1 className="text-3xl font-serif mb-4 text-teal-800">Bem-vindo à sua Galeria Pessoal</h1>
          <p className="text-lg text-muted-foreground max-w-md">Faça login para ver e gerenciar suas obras de arte, ou crie uma conta para começar sua coleção.</p>
          <Link to="/auth">
            <Button className="mt-6 bg-gradient-to-r from-teal-600 to-teal-500 text-white">Entrar ou Cadastrar</Button>
          </Link>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-[#fcfbf9] p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row items-center gap-4 border-b-4 border-amber-400/30 pb-6">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-700 via-yellow-500 to-amber-600">
          Minhas Obras
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
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, CheckCircle, Sparkles } from "lucide-react";
import { showError } from "@/utils/toast";

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("Artista");
  const [isBlocked, setIsBlocked] = useState(true);

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile, error } = await supabase
        .from("user")
        .select("nome, bloc")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profile) {
        setUserName(profile.nome || "Artista");
        setIsBlocked(profile.bloc);
        
        // Se não estiver bloqueado, redirecionar para galeria
        if (!profile.bloc) {
          navigate("/my-gallery");
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status do usuário:", error);
      showError("Erro ao carregar informações do perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    const adminWhatsApp = import.meta.env.VITE_ADMIN_WHATSAPP || "+5511999999999";
    const message = `Olá! Sou ${userName} e acabei de me cadastrar na plataforma Minhas Artes. Gostaria de solicitar o desbloqueio da minha conta.`;
    const whatsappUrl = `https://wa.me/${adminWhatsApp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="text-center mb-8 animate-fade-in">
        <Sparkles className="h-16 w-16 mx-auto text-yellow-500 mb-4 animate-pulse" />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          Bem-vindo ao Minhas Artes!
        </h1>
        <p className="text-xl text-muted-foreground">
          Olá, <span className="font-semibold text-foreground">{userName}</span>! 👋
        </p>
      </div>

      <Card className="shadow-xl border-2">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl">
            {isBlocked ? "Sua conta está quase pronta!" : "Conta Aprovada!"}
          </CardTitle>
          <CardDescription className="text-base">
            {isBlocked 
              ? "Mais um pequeno passo e você terá acesso completo à plataforma"
              : "Você já tem acesso completo à plataforma"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {isBlocked ? (
            <>
              {/* Banner de destaque */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-lg text-center animate-pulse">
                <p className="font-bold text-lg">
                  👋 Falta apenas um passo! Clique no botão abaixo para liberar sua conta
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-blue-600" />
                  Solicite a aprovação da sua conta
                </h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  Para garantir a qualidade e segurança da nossa comunidade de artistas, 
                  todas as contas passam por uma aprovação rápida. Clique no botão abaixo 
                  para entrar em contato com nosso administrador via WhatsApp e liberar 
                  seu acesso!
                </p>
                
                <Button 
                  onClick={handleWhatsAppClick}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-8 text-xl gap-3 shadow-2xl animate-pulse hover:animate-none transition-all hover:scale-105"
                  size="lg"
                >
                  <MessageCircle className="h-7 w-7" />
                  Solicitar Desbloqueio via WhatsApp
                  <span className="ml-2 text-2xl">→</span>
                </Button>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-3">
                  O que você pode fazer enquanto aguarda:
                </h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Explorar a galeria pública de obras de outros artistas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Conhecer o perfil de artistas da comunidade</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <span>Aguardar a aprovação (geralmente em menos de 24 horas)</span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="w-full"
                >
                  Explorar Galeria Pública
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
              <p className="text-lg">
                Sua conta foi aprovada! Você já pode aproveitar todos os recursos da plataforma.
              </p>
              <Button 
                onClick={() => navigate("/my-gallery")}
                className="w-full"
                size="lg"
              >
                Ir para Minha Galeria
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Dúvidas? Entre em contato com{" "}
          <button 
            onClick={handleWhatsAppClick}
            className="text-primary hover:underline font-medium"
          >
            nosso suporte
          </button>
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;

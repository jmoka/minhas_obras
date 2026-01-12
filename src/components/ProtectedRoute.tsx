import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { showError } from "@/utils/toast";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireUnblocked?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireUnblocked = false 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      if (requireUnblocked) {
        const { data: profile, error } = await supabase
          .from("user")
          .select("bloc")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (profile?.bloc) {
          console.log('[ProtectedRoute] Acesso negado - usuário bloqueado');
          showError('Sua conta precisa de aprovação. Solicite o desbloqueio via WhatsApp!');
          navigate('/welcome', { replace: true });
          return;
        }
      }

      setIsAllowed(true);
    } catch (error) {
      console.error("Erro ao verificar acesso:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAllowed ? <>{children}</> : null;
};

export default ProtectedRoute;

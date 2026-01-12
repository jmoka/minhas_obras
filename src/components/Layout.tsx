import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Palette, User, Plus, Users, LogIn, LogOut, Menu, X, Home, AlertCircle, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showSuccess } from "@/utils/toast";
import { useQuery } from "@tanstack/react-query";
import { fetchArtistProfile } from "@/integrations/supabase/api";
import { getBlockedMessage } from "@/utils/blockedUserMessages";
import { showError } from "@/utils/toast";

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem: React.FC<{ 
  to: string; 
  icon: React.ReactNode; 
  label: string; 
  onClick?: (e: React.MouseEvent) => void 
}> = ({ to, icon, label, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
  >
    {icon}
    <span>{label}</span>
  </Link>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Lista de rotas permitidas para usuários bloqueados
  const allowedRoutesForBlocked = [
    '/',
    '/welcome',
    '/auth',
    '/obras',
    '/artist'
  ];

  // Função para verificar se rota é permitida
  const isRouteAllowed = (pathname: string): boolean => {
    return allowedRoutesForBlocked.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    );
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    showSuccess("Logout realizado com sucesso!");
    navigate("/");
    setIsMenuOpen(false);
  }; 

  const { data: profile } = useQuery({
    queryKey: ["artistProfile"],
    queryFn: fetchArtistProfile,
    enabled: isAuthenticated,
  });

  // Middleware global: Redirecionar usuários bloqueados para /welcome
  useEffect(() => {
    if (isAuthenticated && profile?.bloc) {
      const currentPath = location.pathname;
      
      if (!isRouteAllowed(currentPath)) {
        console.log('[Layout] Usuário bloqueado tentou acessar:', currentPath);
        const message = getBlockedMessage(currentPath);
        showError(message);
        navigate('/welcome', { replace: true });
      }
    }
  }, [isAuthenticated, profile, location.pathname, navigate]); 

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm dark:bg-background/80">
        <div className="container mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center" onClick={closeMenu}>
              <img src="/logo.png" alt="Art Gallery" className="h-14 w-auto" />
            </Link>
            
            {isAuthenticated && profile?.bloc && (
              <Badge 
                variant="outline" 
                className="hidden sm:flex bg-yellow-100 text-yellow-800 border-yellow-300 gap-1 animate-pulse"
              >
                <AlertCircle className="h-3 w-3" />
                Conta Pendente de Aprovação
              </Badge>
            )}
          </div>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-4 items-center">
            <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Início" />
            {isAuthenticated && (
              <>
                <NavItem 
                  to="/analyzer" 
                  icon={<Sparkles className="h-5 w-5" />} 
                  label="Analisador IA"
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('✨ Para usar o analisador, sua conta precisa ser aprovada.');
                      navigate('/welcome');
                    }
                  }}
                />
                <NavItem 
                  to="/forum" 
                  icon={<MessageSquare className="h-5 w-5" />} 
                  label="Fórum"
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('💬 Para acessar o fórum, sua conta precisa ser aprovada.');
                      navigate('/welcome');
                    }
                  }}
                />
                <NavItem 
                  to="/my-gallery" 
                  icon={<Palette className="h-5 w-5" />} 
                  label="Minhas Obras"
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('🎨 Para criar e gerenciar suas obras, solicite a aprovação da sua conta primeiro!');
                      navigate('/welcome');
                    }
                  }}
                />
                <NavItem 
                  to="/profile" 
                  icon={<User className="h-5 w-5" />} 
                  label="Perfil"
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('👤 Para editar seu perfil, você precisa de aprovação. Clique no botão do WhatsApp!');
                      navigate('/welcome');
                    }
                  }}
                />
                <NavItem 
                  to="/admin/new-obra" 
                  icon={<Plus className="h-5 w-5" />} 
                  label="Adicionar Obra"
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('➕ Para adicionar obras, sua conta precisa ser aprovada pelo administrador.');
                      navigate('/welcome');
                    }
                  }}
                />
                {profile?.admin && (
                  <NavItem to="/admin/users" icon={<Users className="h-5 w-5" />} label="Admin Usuários" />
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Sair</span>
                </Button>
              </>
            )}
            {!isAuthenticated && (
              <Link to="/auth">
                <Button variant="ghost" size="sm">
                  <LogIn className="h-5 w-5 mr-2" />
                  <span>Entrar</span>
                </Button>
              </Link>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2" onClick={toggleMenu}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {isMenuOpen && (
          <nav className="md:hidden border-t p-4 flex flex-col space-y-2 bg-white dark:bg-background">
            <NavItem to="/" icon={<Home className="h-5 w-5" />} label="Início" onClick={closeMenu} />
            {isAuthenticated && (
              <>
                <NavItem 
                  to="/analyzer" 
                  icon={<Sparkles className="h-5 w-5" />} 
                  label="Analisador IA" 
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('✨ Para usar o analisador, sua conta precisa ser aprovada.');
                      navigate('/welcome');
                      closeMenu();
                    } else {
                      closeMenu();
                    }
                  }}
                />
                <NavItem 
                  to="/forum" 
                  icon={<MessageSquare className="h-5 w-5" />} 
                  label="Fórum" 
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('💬 Para acessar o fórum, sua conta precisa ser aprovada.');
                      navigate('/welcome');
                      closeMenu();
                    } else {
                      closeMenu();
                    }
                  }}
                />
                <NavItem 
                  to="/my-gallery" 
                  icon={<Palette className="h-5 w-5" />} 
                  label="Minhas Obras" 
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('🎨 Para criar e gerenciar suas obras, solicite a aprovação da sua conta primeiro!');
                      navigate('/welcome');
                      closeMenu();
                    } else {
                      closeMenu();
                    }
                  }}
                />
                <NavItem 
                  to="/profile" 
                  icon={<User className="h-5 w-5" />} 
                  label="Perfil" 
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('👤 Para editar seu perfil, você precisa de aprovação. Clique no botão do WhatsApp!');
                      navigate('/welcome');
                      closeMenu();
                    } else {
                      closeMenu();
                    }
                  }}
                />
                <NavItem 
                  to="/admin/new-obra" 
                  icon={<Plus className="h-5 w-5" />} 
                  label="Adicionar Obra" 
                  onClick={(e) => {
                    if (profile?.bloc) {
                      e.preventDefault();
                      showError('➕ Para adicionar obras, sua conta precisa ser aprovada pelo administrador.');
                      navigate('/welcome');
                      closeMenu();
                    } else {
                      closeMenu();
                    }
                  }}
                />
                {profile?.admin && (
                  <NavItem to="/admin/users" icon={<Users className="h-5 w-5" />} label="Admin Usuários" onClick={closeMenu} />
                )}
                <Button variant="ghost" size="sm" onClick={handleLogout} className="justify-start w-full">
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Sair</span>
                </Button>
              </>
            )}
            {!isAuthenticated && (
              <Link to="/auth" onClick={closeMenu}>
                <Button variant="ghost" size="sm" className="justify-start w-full">
                  <LogIn className="h-5 w-5 mr-2" />
                  <span>Entrar</span>
                </Button>
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className={cn("flex-grow container mx-auto p-4 sm:p-8")}>
        {children}
      </main>
      
      {/* Footer */}
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Art Gallery. All rights reserved.
      </footer>
    </div>
  );
};

export default Layout;
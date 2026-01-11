import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Palette, User, Plus, Users, LogIn, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";
import { useQuery } from "@tanstack/react-query";
import { fetchArtistProfile } from "@/integrations/supabase/api";

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string; onClick?: () => void }> = ({ to, icon, label, onClick }) => (
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const showAdminLink = true;

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

  if (isAuthenticated && profile?.bloc) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md p-6 text-center space-y-4 border rounded-lg">
          <h1 className="text-xl font-semibold">Conta bloqueada</h1>
          <p>Sua conta está bloqueada. Entre em contato com o administrador.</p>
          <Button onClick={handleLogout}>Sair</Button>
        </div>
      </div>
    );
  } 

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm dark:bg-background/80">
        <div className="container mx-auto flex justify-between items-center p-4">
          <Link to="/" className="flex items-center" onClick={closeMenu}>
            <img src="/logo.png" alt="Art Gallery" className="h-14 w-auto" />
          </Link>
          
          {/* Desktop Nav */}
          <nav className="hidden md:flex space-x-4 items-center">
            <NavItem to="/" icon={<Palette className="h-5 w-5" />} label="Gallery" />
            {isAuthenticated && (
              <>
                <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
                <NavItem to="/admin/new-obra" icon={<Plus className="h-5 w-5" />} label="Add Art" />
                {showAdminLink && (
                  <NavItem to="/admin/users" icon={<Users className="h-5 w-5" />} label="Admin Users" />
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
            <NavItem to="/" icon={<Palette className="h-5 w-5" />} label="Gallery" onClick={closeMenu} />
            {isAuthenticated && (
              <>
                <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" onClick={closeMenu} />
                <NavItem to="/admin/new-obra" icon={<Plus className="h-5 w-5" />} label="Add Art" onClick={closeMenu} />
                {showAdminLink && (
                  <NavItem to="/admin/users" icon={<Users className="h-5 w-5" />} label="Admin Users" onClick={closeMenu} />
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
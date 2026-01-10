import React from "react";
import { Link } from "react-router-dom";
import { Palette, User, Plus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const NavItem: React.FC<{ to: string; icon: React.ReactNode; label: string }> = ({ to, icon, label }) => (
  <Link
    to={to}
    className="flex items-center space-x-2 p-3 rounded-lg hover:bg-gray-100 transition-colors dark:hover:bg-gray-800"
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </Link>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  // NOTE: In a real app, we would check admin status here to conditionally render the link.
  // For now, we display it, and the page itself handles the access check.
  const showAdminLink = true; 

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header/Navigation */}
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-sm dark:bg-background/80">
        <div className="container mx-auto flex justify-between items-center p-4">
          <Link to="/" className="text-2xl font-serif font-bold text-primary dark:text-primary-foreground flex items-center">
            <Palette className="mr-2 h-6 w-6" />
            Art Gallery
          </Link>
          <nav className="flex space-x-4">
            <NavItem to="/" icon={<Palette className="h-5 w-5" />} label="Gallery" />
            <NavItem to="/profile" icon={<User className="h-5 w-5" />} label="Profile" />
            <NavItem to="/admin/new-obra" icon={<Plus className="h-5 w-5" />} label="Add Art" />
            {showAdminLink && (
              <NavItem to="/admin/users" icon={<Users className="h-5 w-5" />} label="Admin Users" />
            )}
          </nav>
        </div>
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
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import PublicGallery from "./pages/PublicGallery";
import MyGallery from "./pages/MyGallery";
import NotFound from "./pages/NotFound";
import ObraDetail from "./pages/ObraDetail";
import AdminNewObra from "./pages/AdminNewObra";
import AdminEditObra from "./pages/AdminEditObra";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import AdminUserManagement from "./pages/AdminUserManagement";
import AuthPage from "./pages/AuthPage";
import ArtistPublicPage from "./pages/ArtistPublicPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<PublicGallery />} />
            <Route path="/my-gallery" element={<MyGallery />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/obras/:id" element={<ObraDetail />} />
            <Route path="/admin/new-obra" element={<AdminNewObra />} />
            <Route path="/admin/edit-obra/:id" element={<AdminEditObra />} />
            <Route path="/admin/users" element={<AdminUserManagement />} />
            <Route path="/profile" element={<ArtistProfilePage />} />
            <Route path="/artist/:userId" element={<ArtistPublicPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
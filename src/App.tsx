import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import RecoveryDetector from "./components/RecoveryDetector";
import ProtectedRoute from "./components/ProtectedRoute";
import { TrackingProvider } from "./components/TrackingProvider";
import PublicGallery from "./pages/PublicGallery";
import MyGallery from "./pages/MyGallery";
import NotFound from "./pages/NotFound";
import ObraDetail from "./pages/ObraDetail";
import AdminNewObra from "./pages/AdminNewObra";
import AdminEditObra from "./pages/AdminEditObra";
import ArtistProfilePage from "./pages/ArtistProfilePage";
import AdminUserManagement from "./pages/AdminUserManagement";
import AdminAnalytics from "./pages/AdminAnalytics";
import AuthPage from "./pages/AuthPage";
import ArtistPublicPage from "./pages/ArtistPublicPage";
import WelcomePage from "./pages/WelcomePage";
import ForumPage from "./pages/ForumPage";
import TopicPage from "./pages/TopicPage";
import ArtworkAnalyzerPage from "./pages/ArtworkAnalyzerPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import ApiSettingsPage from "./pages/ApiSettingsPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <RecoveryDetector />
        <TrackingProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<PublicGallery />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/obras/:id" element={<ObraDetail />} />
              <Route path="/artist/:userId" element={<ArtistPublicPage />} />
              
              {/* Rotas protegidas - requerem usuário desbloqueado */}
              <Route path="/my-gallery" element={
                <ProtectedRoute requireUnblocked={true}>
                  <MyGallery />
                </ProtectedRoute>
              } />
              <Route path="/admin/new-obra" element={
                <ProtectedRoute requireUnblocked={true}>
                  <AdminNewObra />
                </ProtectedRoute>
              } />
              <Route path="/admin/edit-obra/:id" element={
                <ProtectedRoute requireUnblocked={true}>
                  <AdminEditObra />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireUnblocked={true}>
                  <AdminUserManagement />
                </ProtectedRoute>
              } />
              <Route path="/admin/analytics" element={
                <ProtectedRoute requireUnblocked={true}>
                  <AdminAnalytics />
                </ProtectedRoute>
              } />
              <Route path="/admin/settings" element={
                <ProtectedRoute requireUnblocked={true}>
                  <AdminSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/settings/api" element={
                <ProtectedRoute requireUnblocked={true}>
                  <ApiSettingsPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute requireUnblocked={true}>
                  <ArtistProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/forum" element={
                <ProtectedRoute requireUnblocked={true}>
                  <ForumPage />
                </ProtectedRoute>
              } />
              <Route path="/forum/:topicId" element={
                <ProtectedRoute requireUnblocked={true}>
                  <TopicPage />
                </ProtectedRoute>
              } />
              <Route path="/analyzer" element={
                <ProtectedRoute requireUnblocked={true}>
                  <ArtworkAnalyzerPage />
                </ProtectedRoute>
              } />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </TrackingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
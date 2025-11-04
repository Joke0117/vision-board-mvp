// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth"; 
import { ProtectedRoute } from "@/components/ProtectedRoute"; 
import { AdminRoute } from "@/components/AdminRoute"; 

// Páginas
import Index from "./pages/Index";
import Organigrama from "./pages/Organigrama";
import LogrosMetas from "./pages/LogrosMetas";
import Galeria from "./pages/Galeria";
import MisionVision from "./pages/MisionVision";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login"; 
import AdminDashboard from "./pages/AdminDashboard"; 
import MyContent from "./pages/MyContent"; // <-- CAMBIADO

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/organigrama" element={<Organigrama />} />
              <Route path="/logros-metas" element={<LogrosMetas />} />
              <Route path="/galeria" element={<Galeria />} />
              <Route path="/mision-vision" element={<MisionVision />} />
              <Route path="/mi-contenido" element={<MyContent />} /> {/* <-- CAMBIADO */}
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
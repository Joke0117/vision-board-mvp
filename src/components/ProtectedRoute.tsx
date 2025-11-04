// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const ProtectedRoute = () => {
  const { user } = useAuth();

  if (!user) {
    // Si no está logueado, redirige a /login
    return <Navigate to="/login" replace />;
  }

  // Si está logueado, muestra el contenido de la ruta
  return <Outlet />;
};
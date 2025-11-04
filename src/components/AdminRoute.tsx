// src/components/AdminRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export const AdminRoute = () => {
  const { user } = useAuth();

  if (!user) {
    // No logueado
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    // Logueado pero NO es admin, redirige al inicio
    return <Navigate to="/" replace />;
  }

  // Es admin, muestra el dashboard
  return <Outlet />;
};
// src/hooks/useAuth.tsx
import * as React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/firebaseConfig";
import { Skeleton } from "@/components/ui/skeleton";

interface AuthUser extends User {
  role?: "admin" | "user";
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      // ---- INICIO DE LA CORRECCIÓN ----
      try {
        if (firebaseUser) {
          // Usuario está logueado, buscar su rol en Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              ...firebaseUser,
              role: userData.role,
            });
          } else {
            // El usuario existe en Auth pero no en Firestore (raro, pero posible)
            console.error("Error: El usuario existe en Auth pero no en Firestore.");
            setUser(firebaseUser as AuthUser); // Loguear sin rol
          }
        } else {
          // No hay usuario
          setUser(null);
        }
      } catch (error) {
        console.error("Error al obtener el rol del usuario:", error);
        // Si hay un error (ej. reglas de Firestore), loguear al usuario sin rol
        if (firebaseUser) {
          setUser(firebaseUser as AuthUser);
        } else {
          setUser(null);
        }
      } finally {
        // Asegurarnos de que el loading siempre termine
        setLoading(false);
      }
      // ---- FIN DE LA CORRECCIÓN ----
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Muestra un loader mientras se verifica la sesión
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para consumir el contexto
export const useAuth = () => useContext(AuthContext);
import * as React from "react";
import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
// 1. IMPORTAR FUNCIÓN
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 
import { auth } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import logo from "@/assets/multimedia-logo.png";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 2. NUEVO ESTADO PARA MENSAJE DE ÉXITO
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetMessage(null); // Limpiar mensaje de reset al intentar loguearse

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // El AuthProvider se encargará de redirigir al detectar el usuario
      navigate("/"); // Redirige al inicio tras login exitoso
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("auth/invalid-credential")) {
          setError("Correo o contraseña incorrectos.");
        } else {
          setError("Error al iniciar sesión. Inténtalo de nuevo.");
        }
      }
      setLoading(false);
    }
  };

  // 3. NUEVA FUNCIÓN PARA RESTABLECER CONTRASEÑA
  const handlePasswordReset = async () => {
    setError(null);
    setResetMessage(null);

    if (!email) {
      setError("Por favor, ingresa tu correo electrónico para restablecer la contraseña.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetMessage("¡Enlace enviado! Revisa tu correo electrónico (y la carpeta de spam) para cambiar tu contraseña.");
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        if (err.message.includes("auth/user-not-found")) {
          setError("No se encontró una cuenta con ese correo electrónico.");
        } else {
          setError("Error al enviar el correo de restablecimiento. Inténtalo de nuevo.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Si el usuario ya está logueado, redirigir a la home
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="text-center">
          <img src={logo} alt="Multimedia Logo" className="h-24 w-24 mx-auto mb-4" />
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Panel Multimedia
          </CardTitle>
          <CardDescription>Inicia sesión para acceder al panel del equipo.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Alerta de Error de Login/Reset */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {/* 4. ALERTA DE ÉXITO PARA RESTABLECER CONTRASEÑA */}
          {resetMessage && (
              <Alert className="mb-4 border-green-500 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-300 dark:bg-green-900">
                  <AlertDescription>{resetMessage}</AlertDescription>
              </Alert>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu.correo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* 5. BOTÓN/ENLACE DE OLVIDÓ CONTRASEÑA */}
            <div className="flex justify-end">
                <Button 
                    type="button" 
                    variant="link" 
                    size="sm" 
                    onClick={handlePasswordReset} 
                    disabled={loading}
                    className="text-sm p-0 h-auto font-normal text-muted-foreground hover:text-primary"
                >
                    ¿Olvidaste tu contraseña?
                </Button>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
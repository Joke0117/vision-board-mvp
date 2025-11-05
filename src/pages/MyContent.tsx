// src/pages/MyContent.tsx
import * as React from "react";
import { useState, useEffect } from "react";
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { CalendarCheck, Star, Hourglass, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label"; // <-- Importar Label para móvil

// Interfaz para el contenido (actualizada)
interface Content {
  id: string;
  type: string;
  platform: string;
  publishDate: string;
  contentIdea: string;
  
  // --- CAMPOS ACTUALIZADOS ---
  responsibleIds: string[];
  responsibleEmails: string[];
  isActive: boolean;
  
  status: "Planeado" | "En Progreso" | "Publicado" | "Revisión";
  createdAt: Timestamp;
}

const MyContent = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
  });

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // ==================================
    // LÓGICA DE CONSULTA CORREGIDA
    // ==================================
    const userContentQuery = query(
      collection(db, "contentSchedule"),
      // 1. Buscar tu ID dentro del array 'responsibleIds'
      where("responsibleIds", "array-contains", user.uid),
      // 2. Traer SOLO las tareas que están activas
      where("isActive", "==", true),
      orderBy("publishDate", "desc")
    );

    const unsubscribe = onSnapshot(userContentQuery, (snapshot) => {
      const contentData: Content[] = [];
      let pending = 0, inProgress = 0, completed = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Content, "id">;
        contentData.push({ id: doc.id, ...data });

        if (data.status === "Planeado" || data.status === "Revisión") pending++;
        if (data.status === "En Progreso") inProgress++;
        if (data.status === "Publicado") completed++;
      });
      
      setContent(contentData);
      setStats({
        pendingTasks: pending,
        inProgressTasks: inProgress,
        completedTasks: completed,
      });
      setLoading(false);
    }, (error) => {
      console.error("Error en la consulta de Firestore:", error);
      if (error.code === 'failed-precondition') {
        console.warn("--- ADVERTENCIA DE FIREBASE ---");
        console.warn("Se necesita un índice compuesto. Por favor, crea el índice usando el enlace que debe aparecer en la consola de tu navegador.");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (contentId: string, newStatus: Content['status']) => {
    try {
      const contentDocRef = doc(db, "contentSchedule", contentId);
      await updateDoc(contentDocRef, {
        status: newStatus
      });
    } catch (error) {
      console.error("Error al actualizar estado: ", error);
    }
  };

  const getStatusVariant = (status: Content['status']) => {
    switch (status) {
      case 'Publicado': return 'default';
      case 'En Progreso': return 'secondary';
      case 'Planeado': return 'destructive';
      case 'Revisión': return 'outline';
      default: 'outline';
    }
  };

  return (
    <UserLayout>
      {/* Padding responsivo */}
      <div className="flex-1 space-y-6 md:space-y-8 p-4 md:p-8 pt-4 md:pt-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Mi Dashboard de Contenido
        </h1>

        {/* Stats de usuario (ya eran responsivas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Card className="border-l-4 border-destructive dark:border-destructive">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
              <Hourglass className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{stats.pendingTasks}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-yellow-500 dark:border-yellow-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Star className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{stats.inProgressTasks}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-primary dark:border-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">Tareas Completadas</CardTitle>
              <CheckCircle className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-4">
              <div className="text-3xl font-bold">{stats.completedTasks}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mis Asignaciones</CardTitle>
            <CardDescription>
              Aquí puedes ver y actualizar el estado de las publicaciones que te han sido asignadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {/* ==================================
              VISTA DE TABLA (SOLO DESKTOP)
              ==================================
            */}
            <div className="border rounded-lg overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Contenido</TableHead>
                    <TableHead className="min-w-[120px]">Plataforma</TableHead>
                    <TableHead className="min-w-[120px]">Fecha de Pub.</TableHead>
                    <TableHead className="min-w-[120px]">Estado Actual</TableHead>
                    <TableHead className="min-w-[180px]">Actualizar Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">Cargando tu contenido...</TableCell>
                    </TableRow>
                  ) : content.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">¡No tienes contenido asignado!</TableCell>
                    </TableRow>
                  ) : (
                    content.map(item => {
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{item.type}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 ml-6">{item.contentIdea}</p>
                          </TableCell>
                          <TableCell>{item.platform}</TableCell>
                          <TableCell>{item.publishDate || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.status} 
                              onValueChange={(newStatus) => handleStatusChange(item.id, newStatus as Content['status'])}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Cambiar estado" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Planeado">Planeado</SelectItem>
                                <SelectItem value="En Progreso">En Progreso</SelectItem>
                                <SelectItem value="Revisión">En Revisión</SelectItem>
                                <SelectItem value="Publicado">Publicado</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ==================================
              VISTA DE CARDS (SOLO MÓVIL)
              ==================================
            */}
            <div className="space-y-4 md:hidden">
              {loading ? (
                <p className="text-center">Cargando tu contenido...</p>
              ) : content.length === 0 ? (
                <p className="text-center">¡No tienes contenido asignado!</p>
              ) : (
                content.map(item => (
                  <Card key={item.id} className="w-full">
                    <CardHeader>
                      <CardTitle className="text-lg">{item.type}</CardTitle>
                      <CardDescription>{item.contentIdea}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Plataforma:</span>
                        <span className="font-semibold">{item.platform}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Fecha Pub.:</span>
                        <span className="font-semibold">{item.publishDate || "N/A"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                      </div>
                      <div className="space-y-2 pt-2">
                         <Label>Actualizar Estado</Label>
                         <Select 
                            value={item.status} 
                            onValueChange={(newStatus) => handleStatusChange(item.id, newStatus as Content['status'])}
                         >
                           <SelectTrigger>
                             <SelectValue placeholder="Cambiar estado" />
                           </SelectTrigger>
                           <SelectContent>
                             <SelectItem value="Planeado">Planeado</SelectItem>
                             <SelectItem value="En Progreso">En Progreso</SelectItem>
                             <SelectItem value="Revisión">En Revisión</SelectItem>
                             <SelectItem value="Publicado">Publicado</SelectItem>
                           </SelectContent>
                         </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
};

export default MyContent;
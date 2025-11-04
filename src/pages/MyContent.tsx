// src/pages/MyContent.tsx
import * as React from "react";
import { useState, useEffect } from "react";
import { UserLayout } from "@/components/UserLayout"; // <-- Usar el nuevo UserLayout
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { CalendarCheck, Star, Hourglass, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils"; // Importar cn

// Interfaz para el contenido
interface Content {
  id: string;
  type: string;
  platform: string;
  publishDate: string;
  contentIdea: string;
  responsibleId: string;
  responsibleEmail: string;
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
    // CORRECCIÓN: Consultar solo el contenido asignado al usuario actual
    const userContentQuery = query(
      collection(db, "contentSchedule"),
      where("responsibleId", "==", user.uid),
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
    <UserLayout> {/* Envuelve el contenido con el UserLayout */}
      <div className="flex-1 space-y-8 p-8 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Mi Dashboard de Contenido
        </h1>

        {/* Stats de usuario con borde de color */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-l-4 border-destructive dark:border-destructive">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tareas Pendientes</CardTitle>
              <Hourglass className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.pendingTasks}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-yellow-500 dark:border-yellow-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Star className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.inProgressTasks}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-primary dark:border-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tareas Completadas</CardTitle>
              <CheckCircle className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
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
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contenido</TableHead>
                    <TableHead>Plataforma</TableHead>
                    <TableHead>Fecha de Pub.</TableHead>
                    <TableHead>Estado Actual</TableHead>
                    <TableHead className="w-[180px]">Actualizar Estado</TableHead>
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
                              // El usuario puede cambiar su propio estado
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
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
};

export default MyContent;
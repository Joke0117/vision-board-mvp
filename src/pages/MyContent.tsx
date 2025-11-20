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
import { 
  Clock, 
  PlayCircle, 
  CheckCircle2, 
  Lock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { addDays, isAfter, parseISO, startOfDay } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interfaz para el contenido
interface Content {
  id: string;
  type: string;
  platform: string;
  publishDate: string;
  contentIdea: string;
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

    const userContentQuery = query(
      collection(db, "contentSchedule"),
      where("responsibleIds", "array-contains", user.uid),
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
      console.error("Error en Firestore:", error);
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

  // --- Lógica de Bloqueo (24h después de la fecha de publicación) ---
  const isTaskLocked = (publishDateString: string) => {
    if (!publishDateString) return false;
    const today = new Date();
    const publishDate = parseISO(publishDateString);
    // Sumamos 1 día (24 horas) a la fecha de publicación
    const deadline = addDays(publishDate, 1); 
    // Si hoy es DESPUÉS de la fecha límite, bloqueamos
    return isAfter(today, deadline);
  };

  const getStatusVariant = (status: Content['status']) => {
    switch (status) {
      case 'Publicado': return 'default';
      case 'En Progreso': return 'secondary';
      case 'Planeado': return 'destructive';
      case 'Revisión': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <UserLayout>
      <div className="flex-1 space-y-6 md:space-y-8 p-4 md:p-8 pt-4 md:pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Mi Dashboard de Contenido
          </h1>
        </div>

        {/* --- CARDS DE ESTADÍSTICAS (ESTILO NUEVO) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            
            {/* Card Pendientes */}
            <Card className="bg-background shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Tareas Pendientes</p>
                        <div className="text-2xl font-bold text-red-600 mt-1">{stats.pendingTasks}</div>
                    </div>
                    <div className="p-3 bg-red-50 rounded-full">
                        <Clock className="h-6 w-6 text-red-500" />
                    </div>
                </CardContent>
            </Card>

            {/* Card En Progreso */}
            <Card className="bg-background shadow-sm border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">En Progreso</p>
                        <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.inProgressTasks}</div>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-full">
                        <PlayCircle className="h-6 w-6 text-yellow-500" />
                    </div>
                </CardContent>
            </Card>

            {/* Card Completadas */}
            <Card className="bg-background shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Completadas</p>
                        <div className="text-2xl font-bold text-green-600 mt-1">{stats.completedTasks}</div>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                </CardContent>
            </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Mis Asignaciones</CardTitle>
            <CardDescription>
              Gestiona tus tareas asignadas. Tienes hasta 24 horas después de la fecha para actualizar el estado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {/* ==================================
              VISTA DE TABLA (DESKTOP)
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
                      <TableCell colSpan={5} className="text-center py-8">Cargando tu contenido...</TableCell>
                    </TableRow>
                  ) : content.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                         ¡Estás libre! No tienes tareas asignadas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    content.map(item => {
                      const locked = isTaskLocked(item.publishDate);

                      return (
                        <TableRow key={item.id} className={locked ? "bg-muted/30" : ""}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="font-semibold">{item.type}</span>
                              <span className="text-xs text-muted-foreground truncate max-w-[250px]" title={item.contentIdea}>
                                {item.contentIdea}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{item.platform}</TableCell>
                          <TableCell>
                             <div className="flex items-center gap-2">
                                {item.publishDate || "N/A"}
                                {locked && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <AlertCircle className="h-4 w-4 text-destructive" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Tarea vencida hace más de 24h</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                             </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          </TableCell>
                          <TableCell>
                            {locked ? (
                                <div className="flex items-center text-muted-foreground text-sm gap-2 bg-muted px-3 py-2 rounded-md border">
                                    <Lock className="h-4 w-4" />
                                    <span>Cerrado</span>
                                </div>
                            ) : (
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
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* ==================================
              VISTA DE CARDS (MÓVIL)
              ==================================
            */}
            <div className="space-y-4 md:hidden">
              {loading ? (
                <p className="text-center py-4">Cargando tu contenido...</p>
              ) : content.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">¡No tienes contenido asignado!</p>
              ) : (
                content.map(item => {
                   const locked = isTaskLocked(item.publishDate);
                   
                   return (
                    <Card key={item.id} className={cn("w-full border-l-4 shadow-sm", locked ? "border-l-muted bg-muted/10" : "border-l-primary")}>
                        <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-lg">{item.type}</CardTitle>
                                <CardDescription className="line-clamp-2">{item.contentIdea}</CardDescription>
                            </div>
                            {locked && <Lock className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Plataforma:</span>
                            <span className="font-medium">{item.platform}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Fecha:</span>
                            <span className={cn("font-medium", locked && "text-destructive")}>
                                {item.publishDate || "N/A"}
                            </span>
                        </div>
                        
                        <div className="pt-2 border-t mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-muted-foreground">Estado Actual:</span>
                                <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                            </div>
                            
                            {locked ? (
                                <div className="w-full bg-muted text-muted-foreground text-center py-2 rounded text-sm flex items-center justify-center gap-2">
                                    <Lock className="h-3 w-3" /> Edición bloqueada (Vencida)
                                </div>
                            ) : (
                                <Select 
                                    value={item.status} 
                                    onValueChange={(newStatus) => handleStatusChange(item.id, newStatus as Content['status'])}
                                >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Actualizar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Planeado">Planeado</SelectItem>
                                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                                    <SelectItem value="Revisión">En Revisión</SelectItem>
                                    <SelectItem value="Publicado">Publicado</SelectItem>
                                </SelectContent>
                                </Select>
                            )}
                        </div>
                        </CardContent>
                    </Card>
                   );
                })
              )}
            </div>

          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
};

export default MyContent;
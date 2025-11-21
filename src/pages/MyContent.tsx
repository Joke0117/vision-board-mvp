// src/pages/MyContent.tsx
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
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
  AlertCircle,
  Trophy,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { addDays, isAfter, parseISO, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interfaz actualizada para el contenido
interface Content {
  id: string;
  type: string;
  platform: string[]; // Ahora es un array
  recurrenceDays?: string[]; // Nuevo campo
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
        const data = doc.data();
        // Normalizamos la plataforma a array para que no falle
        const normalizedPlatform = Array.isArray(data.platform) ? data.platform : (data.platform ? [data.platform] : []);

        const taskItem = { 
            id: doc.id, 
            ...data,
            platform: normalizedPlatform,
            recurrenceDays: data.recurrenceDays || []
        } as Content;
        
        contentData.push(taskItem);

        if (taskItem.status === "Planeado" || taskItem.status === "Revisión") pending++;
        if (taskItem.status === "En Progreso") inProgress++;
        if (taskItem.status === "Publicado") completed++;
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

  // --- CÁLCULO DE RENDIMIENTO SEMANAL ---
  const weeklyPerformance = useMemo(() => {
    const now = new Date();
    // Obtenemos lunes y domingo de la semana actual
    const start = startOfWeek(now, { weekStartsOn: 1 }); 
    const end = endOfWeek(now, { weekStartsOn: 1 });

    // Filtramos las tareas de ESTA SEMANA (o recurrentes activas)
    const weeklyTasks = content.filter(task => {
        // 1. Si es recurrente y está activa, cuenta para la semana
        if (task.recurrenceDays && task.recurrenceDays.length > 0 && task.isActive) {
            return true;
        }
        // 2. Si tiene fecha específica, verificamos si cae en esta semana
        if (task.publishDate) {
            const date = parseISO(task.publishDate);
            return isWithinInterval(date, { start, end });
        }
        return false;
    });

    const total = weeklyTasks.length;
    const completed = weeklyTasks.filter(t => t.status === "Publicado").length;
    
    // Cálculo del Score (1 a 5)
    // Si no hay tareas, asumimos 5 (o 0 si prefieres ser estricto, aquí puse 5 como "todo al día")
    // Pero para ser justos, si total es 0, score es 0 (Sin actividad).
    let score = 0;
    if (total > 0) {
        score = (completed / total) * 5;
    }

    // Mensaje según score
    let message = "Sin actividad";
    let color = "text-muted-foreground";
    if (total > 0) {
        if (score >= 4.5) { message = "¡Excelente Semana!"; color = "text-green-600"; }
        else if (score >= 3.5) { message = "Buen trabajo"; color = "text-blue-600"; }
        else if (score >= 2.5) { message = "Puedes mejorar"; color = "text-yellow-600"; }
        else { message = "Atención requerida"; color = "text-red-600"; }
    }

    return {
        total,
        completed,
        score: score.toFixed(1), // Un decimal
        message,
        color
    };
  }, [content]);


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

  const isTaskLocked = (publishDateString: string) => {
    if (!publishDateString) return false;
    const today = new Date();
    const publishDate = parseISO(publishDateString);
    const deadline = addDays(publishDate, 1); 
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
            Mis TareasC
          </h1>
        </div>

        {/* --- CARDS DE ESTADÍSTICAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* === NUEVA CARD: RENDIMIENTO SEMANAL === */}
            <Card className="bg-gradient-to-br from-background to-muted border-2 border-primary/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                    <Trophy className="h-16 w-16 text-primary" />
                </div>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase flex items-center gap-2">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        Calificación Semanal
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end gap-2">
                        <div className={cn("text-4xl font-bold", weeklyPerformance.color)}>
                            {weeklyPerformance.score}
                        </div>
                        <div className="text-sm text-muted-foreground mb-1 font-medium">
                            / 5.0
                        </div>
                    </div>
                    <p className={cn("text-xs font-semibold mt-1", weeklyPerformance.color)}>
                        {weeklyPerformance.message}
                    </p>
                    <div className="mt-2 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div 
                            className={cn("h-full transition-all duration-500", weeklyPerformance.score === "5.0" ? "bg-green-500" : "bg-primary")} 
                            style={{ width: `${(parseFloat(weeklyPerformance.score) / 5) * 100}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2 text-right">
                        {weeklyPerformance.completed} de {weeklyPerformance.total} tareas esta semana
                    </p>
                </CardContent>
            </Card>

            {/* Card Pendientes */}
            <Card className="bg-background shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Pendientes</CardTitle>
                    <Clock className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.pendingTasks}</div>
                </CardContent>
            </Card>

            {/* Card En Progreso */}
            <Card className="bg-background shadow-sm border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">En Progreso</CardTitle>
                    <PlayCircle className="h-5 w-5 text-yellow-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{stats.inProgressTasks}</div>
                </CardContent>
            </Card>

            {/* Card Completadas */}
            <Card className="bg-background shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Completadas</CardTitle>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
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
            
            {/* VISTA DE TABLA (DESKTOP) */}
            <div className="border rounded-lg overflow-x-auto hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Contenido</TableHead>
                    <TableHead className="min-w-[120px]">Plataforma</TableHead>
                    <TableHead className="min-w-[120px]">Fecha / Días</TableHead>
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
                          <TableCell>
                             {item.platform && item.platform.length > 0 ? item.platform.join(", ") : "N/A"}
                          </TableCell>
                          <TableCell>
                             <div className="flex flex-col">
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
                                {item.recurrenceDays && item.recurrenceDays.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {item.recurrenceDays.length === 7 ? "Todos los días" : item.recurrenceDays.map(d => d.substring(0,3)).join(", ")}
                                    </span>
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

            {/* VISTA DE CARDS (MÓVIL) */}
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
                            <span className="font-medium">{item.platform?.join(", ")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Fecha:</span>
                            <div className="text-right">
                                <span className={cn("font-medium", locked && "text-destructive")}>
                                    {item.publishDate || "N/A"}
                                </span>
                                {item.recurrenceDays && item.recurrenceDays.length > 0 && (
                                    <span className="text-xs text-muted-foreground block">
                                        {item.recurrenceDays.join(", ")}
                                    </span>
                                )}
                            </div>
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
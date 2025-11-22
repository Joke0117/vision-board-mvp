// src/pages/MyContent.tsx
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom"; 
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
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
  Star,
  CalendarDays,
  ListFilter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  addDays, 
  isAfter, 
  parseISO, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  format, 
  isSameDay,
  startOfDay,
  isBefore
} from "date-fns";
import { es } from "date-fns/locale"; 
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Content {
  id: string;
  type: string;
  platform: string[]; 
  recurrenceDays?: string[]; 
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
  const location = useLocation(); 
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  
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

  // --- EFECTO DEEP LINKING (Ir a la tarea desde notificación) ---
  useEffect(() => {
    if (!loading && content.length > 0) {
        const params = new URLSearchParams(location.search);
        const taskId = params.get("taskId"); 

        if (taskId) {
            // Pequeño delay para asegurar renderizado
            setTimeout(() => {
                const element = document.getElementById(`task-${taskId}`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                    element.classList.add("ring-2", "ring-primary", "bg-accent/30");
                    setTimeout(() => {
                        element.classList.remove("ring-2", "ring-primary", "bg-accent/30");
                    }, 3000);
                }
            }, 500);
        }
    }
  }, [loading, content, location.search]);


  // --- LÓGICA CALENDARIO CORREGIDA ---
  const isTaskOnDate = (task: Content, checkDate: Date) => {
    const checkDateStart = startOfDay(checkDate);
    
    // Definir fecha de inicio de la tarea (para no marcar días pasados)
    let taskStartDate: Date | null = null;
    if (task.publishDate) {
        taskStartDate = parseISO(task.publishDate);
    } else if (task.createdAt) {
        taskStartDate = task.createdAt.toDate();
    }

    // 1. Si tiene fecha específica exacta
    if (task.publishDate && isSameDay(parseISO(task.publishDate), checkDate)) {
        return true;
    }

    // 2. Recurrencia (Ej: "Lunes")
    if (task.recurrenceDays && task.recurrenceDays.length > 0) {
        // IMPORTANTE: No marcar si el día del calendario es ANTERIOR a cuando se creó la tarea
        if (taskStartDate && isBefore(checkDateStart, startOfDay(taskStartDate))) {
            return false; 
        }

        const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
        const dayName = daysMap[checkDate.getDay()];
        
        if (task.recurrenceDays.includes(dayName)) {
            return true;
        }
    }
    return false;
  };

  const tasksForSelectedDate = useMemo(() => {
    if (!date) return [];
    return content.filter(task => isTaskOnDate(task, date));
  }, [date, content]);

  const daysWithTasks = (day: Date) => {
    return content.some(task => isTaskOnDate(task, day));
  };

  // --- CÁLCULO DE RENDIMIENTO SEMANAL ---
  const weeklyPerformance = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); 
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const weeklyTasks = content.filter(task => {
        if (task.recurrenceDays && task.recurrenceDays.length > 0 && task.isActive) {
            return true;
        }
        if (task.publishDate) {
            const date = parseISO(task.publishDate);
            return isWithinInterval(date, { start, end });
        }
        return false;
    });

    const total = weeklyTasks.length;
    const completed = weeklyTasks.filter(t => t.status === "Publicado").length;
    
    let score = 0;
    if (total > 0) {
        score = (completed / total) * 5;
    }

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
        score: score.toFixed(1),
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
            Mi Dashboard de Contenido
          </h1>
        </div>

        {/* --- CARDS DE ESTADÍSTICAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            {/* Card Rendimiento */}
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

        {/* --- SECCIÓN PRINCIPAL CON TABS --- */}
        <Tabs defaultValue="list" className="w-full">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Mis Asignaciones</h2>
                <TabsList>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                        <ListFilter className="h-4 w-4" /> <span className="hidden sm:inline">Lista</span>
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" /> <span className="hidden sm:inline">Calendario</span>
                    </TabsTrigger>
                </TabsList>
            </div>

            {/* VISTA DE LISTA (CLÁSICA) */}
            <TabsContent value="list">
                <Card>
                    <CardContent className="p-0">
                        {/* VISTA DE TABLA (DESKTOP) */}
                        <div className="border rounded-lg overflow-x-auto hidden md:block">
                        <Table>
                            <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[200px]">Contenido</TableHead>
                                <TableHead className="min-w-[120px]">Fecha / Días</TableHead>
                                <TableHead className="min-w-[120px]">Estado</TableHead>
                                <TableHead className="min-w-[150px]">Acción</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell></TableRow>
                            ) : content.length === 0 ? (
                                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">¡Estás libre!</TableCell></TableRow>
                            ) : (
                                content.map(item => {
                                const locked = isTaskLocked(item.publishDate);
                                return (
                                    <TableRow 
                                        key={item.id} 
                                        id={`task-${item.id}`}
                                        className={cn("transition-colors duration-500", locked ? "bg-muted/30" : "")}
                                    >
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                        <span className="font-semibold">{item.type}</span>
                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]" title={item.contentIdea}>{item.contentIdea}</span>
                                        <span className="text-xs text-primary mt-1 font-medium">{item.platform?.join(", ")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{item.publishDate || "N/A"}</span>
                                            {item.recurrenceDays && item.recurrenceDays.length > 0 && (
                                                <span className="text-xs text-muted-foreground">{item.recurrenceDays.map(d => d.substring(0,3)).join(", ")}</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant={getStatusVariant(item.status)}>{item.status}</Badge></TableCell>
                                    <TableCell>
                                        {locked ? (
                                            <div className="flex items-center text-muted-foreground text-xs gap-1"><Lock className="h-3 w-3" /> Cerrado</div>
                                        ) : (
                                            <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v as any)}>
                                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
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
                        <div className="space-y-4 md:hidden p-4">
                        {loading ? <p className="text-center">Cargando...</p> : content.map(item => (
                            <Card 
                                key={item.id} 
                                id={`task-${item.id}`}
                                className="border-l-4 border-l-primary shadow-sm transition-all duration-500"
                            >
                                <CardHeader className="pb-2 pt-4">
                                    <div className="flex justify-between">
                                        <CardTitle className="text-lg">{item.type}</CardTitle>
                                        <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                                    </div>
                                    <CardDescription className="line-clamp-2">{item.contentIdea}</CardDescription>
                                </CardHeader>
                                <CardContent className="pb-4 pt-0 space-y-3">
                                    <div className="flex justify-between text-sm mt-2">
                                        <span className="text-muted-foreground">Fecha:</span>
                                        <span className="font-medium">{item.publishDate || item.recurrenceDays?.join(", ")}</span>
                                    </div>
                                    
                                    <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v as any)}>
                                        <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Planeado">Planeado</SelectItem>
                                            <SelectItem value="En Progreso">En Progreso</SelectItem>
                                            <SelectItem value="Revisión">En Revisión</SelectItem>
                                            <SelectItem value="Publicado">Publicado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </CardContent>
                            </Card>
                        ))}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            {/* VISTA DE CALENDARIO (PRO) */}
            <TabsContent value="calendar" className="mt-0">
                <div className="flex flex-col md:flex-row gap-6">
                    
                    {/* 1. EL CALENDARIO */}
                    <Card className="flex-shrink-0 md:w-auto">
                        <CardContent className="p-4 flex justify-center">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border shadow-sm"
                                modifiers={{
                                    booked: (date) => daysWithTasks(date)
                                }}
                                // ESTILO DEL PUNTO ROJO MEJORADO
                                modifiersClassNames={{
                                    booked: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full font-bold text-primary"
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* 2. TAREAS DEL DÍA SELECCIONADO */}
                    <Card className="flex-1 border-dashed bg-muted/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-primary" />
                                {date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : "Selecciona una fecha"}
                            </CardTitle>
                            <CardDescription>
                                Tareas programadas para este día.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {tasksForSelectedDate.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <div className="bg-background p-4 rounded-full mb-3 border">
                                        <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
                                    </div>
                                    <p>Nada programado para este día.</p>
                                    <p className="text-xs">¡Día libre o enfócate en adelantar!</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {tasksForSelectedDate.map(task => (
                                        <div key={task.id} className="flex items-start gap-3 p-3 bg-background rounded-lg border shadow-sm hover:shadow-md transition-shadow">
                                            <div className={cn("w-1.5 self-stretch rounded-full", 
                                                task.status === 'Publicado' ? "bg-green-500" :
                                                task.status === 'Planeado' ? "bg-red-500" : "bg-yellow-500"
                                            )} />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="font-semibold text-sm">{task.type}</h4>
                                                    <Badge variant="outline" className="text-[10px] h-5">{task.status}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.contentIdea}</p>
                                                <div className="flex gap-2 mt-2">
                                                    {task.platform.map(p => (
                                                        <span key={p} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded text-secondary-foreground">
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default MyContent;
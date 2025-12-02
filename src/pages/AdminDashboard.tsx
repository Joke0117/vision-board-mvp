// src/pages/AdminDashboard.tsx
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// AGREGADO: Importamos DropdownMenu para cambiar estados
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { collection, addDoc, getDocs, doc, query, Timestamp, onSnapshot, orderBy, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { 
  PlusCircle, Users, Clock, 
  ChevronsUpDown, Check, Pencil, UserCheck, Filter, 
  X, PlayCircle, CheckCircle2, CalendarDays,
  Trophy, Star, Award, Medal, Crown, Timer, Lock, Info, ListFilter, History, ClipboardList
} from "lucide-react"; 
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  addWeeks, 
  set, 
  isBefore, 
  subWeeks, 
  startOfDay, 
  isAfter, 
  addDays, 
  getDay, 
  isSameDay, 
  format 
} from "date-fns";
import { es } from "date-fns/locale";

// Función segura para obtener fecha de Firestore
const getSafeDate = (timestamp: any): Date => {
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  return new Date(); // Fallback seguro
};

interface TeamUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

// MODIFICADO: Agregados individualStatus y isGroupTask
interface Content {
  id: string;
  type: string;
  platform: string[]; 
  recurrenceDays?: string[];
  publishDate: string;
  format: string;
  objective: string;
  audience: string;
  contentIdea: string;
  responsibleIds: string[];
  responsibleEmails: string[];
  status: "Planeado" | "En Progreso" | "Publicado" | "Revisión";
  individualStatus?: { [userId: string]: string }; // Estado por usuario
  isGroupTask?: boolean; // Flag para tareas grupales (Versículos)
  isActive: boolean;
  createdAt: any; 
}

const PLATFORMS_LIST = ["Facebook", "Instagram", "Whatsapp"];
const DAYS_LIST = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [contentSchedule, setContentSchedule] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados Formularios
  const [openCreateMultiSelect, setOpenCreateMultiSelect] = useState(false);
  const [openEditMultiSelect, setOpenEditMultiSelect] = useState(false);
  const [openCreatePlatform, setOpenCreatePlatform] = useState(false);
  const [openEditPlatform, setOpenEditPlatform] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Content | null>(null);
  
  // Estados Monitor Individual
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [monitorDate, setMonitorDate] = useState<Date | undefined>(new Date());

  const [stats, setStats] = useState({
    planned: 0,
    inProgress: 0,
    published: 0,
    totalUsers: 0,
  });

  const initialFormState = {
    type: "",
    platform: [] as string[], 
    recurrenceDays: [] as string[],
    publishDate: "",
    format: "",
    objective: "",
    audience: "",
    contentIdea: "",
    responsibleIds: [] as string[],
  };
  const [formState, setFormState] = useState(initialFormState);
  
  const [editFormState, setEditFormState] = useState<Omit<Content, "id" | "responsibleEmails" | "status" | "isActive" | "createdAt" | "individualStatus" | "isGroupTask">>({
     type: "",
     platform: [],
     recurrenceDays: [],
     publishDate: "",
     format: "",
     objective: "",
     audience: "",
     contentIdea: "",
     responsibleIds: [],
  });

  // --- CARGA DE DATOS ---
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const usersQuery = query(collection(db, "users"));
        const querySnapshot = await getDocs(usersQuery);
        const teamMembers: TeamUser[] = [];
        querySnapshot.forEach((doc) => {
          teamMembers.push({ id: doc.id, ...(doc.data() as Omit<TeamUser, "id">) });
        });
        setTeam(teamMembers);
        setStats(s => ({ ...s, totalUsers: teamMembers.length }));
      } catch (error) {
        console.error("Error cargando equipo:", error);
      }
    };
    fetchTeam();

    const contentQuery = query(collection(db, "contentSchedule"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(contentQuery, (snapshot) => {
      const contentData: Content[] = [];
      let planned = 0, inProgress = 0, published = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const normalizedPlatform = Array.isArray(data.platform) ? data.platform : (data.platform ? [data.platform] : []);
        
        const taskItem = { 
            id: doc.id, 
            ...data, 
            platform: normalizedPlatform,
            recurrenceDays: data.recurrenceDays || [],
            responsibleIds: data.responsibleIds || [],
            createdAt: data.createdAt,
            // Aseguramos que existan los campos nuevos
            individualStatus: data.individualStatus || {},
            isGroupTask: data.isGroupTask || false 
        } as Content;

        contentData.push(taskItem);
        
        if (taskItem.isActive) {
          if (taskItem.status === "Planeado") planned++;
          if (taskItem.status === "En Progreso") inProgress++;
          if (taskItem.status === "Publicado") published++;
        }
      });
      
      setContentSchedule(contentData);
      setStats(s => ({ ...s, planned, inProgress, published }));
      setLoading(false);
    }, (error) => {
      console.error("Error cargando contenido:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // =========================================================================================
  // LOGICA DE ESTADO INDIVIDUAL Y HELPERS
  // =========================================================================================

  // NUEVO: Obtiene el estado real para un usuario específico (o el global si es grupal)
  const getEffectiveStatus = (task: Content, userId?: string) => {
    // Si es tarea grupal o no hay usuario, usa el estado global
    if (task.isGroupTask || !userId) return task.status;
    // Si es individual, busca en el mapa, o devuelve "Planeado" por defecto
    return task.individualStatus?.[userId] || "Planeado";
  };

  // NUEVO: Maneja el cambio de estado desde el Dropdown
  const handleStatusChange = async (taskId: string, newStatus: string, task: Content) => {
    if (!user) return;
    try {
        const contentRef = doc(db, "contentSchedule", taskId);
        
        if (task.isGroupTask) {
            // Si es grupal (Versículos), actualiza el estado global para todos
            await updateDoc(contentRef, { status: newStatus });
            toast.success(`Estado grupal actualizado a: ${newStatus}`);
        } else {
            // Si es normal, actualiza solo el estado de este usuario en el mapa
            // Usamos la notación de punto de Firestore para actualizar solo una clave del mapa
            await updateDoc(contentRef, {
                [`individualStatus.${user.uid}`]: newStatus
            });
            toast.success(`Tu estado actualizado a: ${newStatus}`);
        }
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        toast.error("Error al actualizar el estado");
    }
  };

  // 1. Ciclo Semanal (Lunes 8:00 AM)
  const getCycleStart = () => {
      const now = new Date();
      let start = startOfWeek(now, { weekStartsOn: 1 });
      start = set(start, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 });
      if (isBefore(now, start)) {
          start = subWeeks(start, 1);
      }
      return start;
  };

  const getCustomWeekInterval = () => {
    const start = getCycleStart(); 
    const end = addWeeks(start, 1); 
    return { start, end };
  };

  // 2. Estado de Bloqueo
  const getTaskLockStatus = (publishDateString: string) => {
    if (!publishDateString) return { isLocked: false, reason: "" };
    
    try {
      const now = new Date();
      const publishDate = parseISO(publishDateString);
      const dayOfWeek = getDay(publishDate); // 0 = Domingo

      let deadline: Date;
      let reason = "";

      if (dayOfWeek === 0) { 
        // Domingo -> Cierra Lunes 8:00 AM
        deadline = set(addDays(publishDate, 1), { hours: 8, minutes: 0, seconds: 0 });
        reason = "Cierre de ciclo: Lunes 8:00 AM";
      } else {
        // Lunes-Sábado -> Cierra al día siguiente 23:59
        deadline = set(addDays(publishDate, 1), { hours: 23, minutes: 59, seconds: 59 });
        reason = "Plazo de 24h vencido.";
      }
      return { isLocked: isAfter(now, deadline), reason };
    } catch (e) {
      return { isLocked: false, reason: "" };
    }
  };

  // 3. Estilos
  const getRankCardStyle = (rank: number | null) => {
      if (rank === 1) return "bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-100 border-yellow-500 text-yellow-950 shadow-lg shadow-yellow-500/30"; 
      if (rank === 2) return "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-100 border-slate-500 text-slate-900 shadow-lg shadow-slate-500/30"; 
      if (rank === 3) return "bg-gradient-to-br from-orange-200 via-orange-300 to-orange-100 border-orange-600 text-orange-950 shadow-lg shadow-orange-500/30"; 
      return "bg-background border-muted text-foreground";
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Publicado': return 'default';
      case 'En Progreso': return 'secondary';
      case 'Planeado': return 'destructive';
      case 'Revisión': return 'outline';
      default: return 'outline';
    }
  };

  // 4. Segmentación de Tareas
  const { currentTasks, historyTasks } = useMemo(() => {
    if (selectedMemberId === "all") return { currentTasks: [], historyTasks: [] };

    // Filtro seguro
    const memberRawTasks = contentSchedule.filter(t => 
       Array.isArray(t.responsibleIds) && t.responsibleIds.includes(selectedMemberId) && t.isActive
    );

    const cycleStart = getCycleStart();
    const cycleStartDay = startOfDay(cycleStart);

    const current: Content[] = [];
    const history: Content[] = [];

    memberRawTasks.forEach(task => {
        if (task.recurrenceDays && task.recurrenceDays.length > 0) {
            current.push(task);
            return;
        }
        if (task.publishDate) {
            const taskDate = parseISO(task.publishDate);
            if (isBefore(taskDate, cycleStartDay)) {
                history.push(task);
            } else {
                current.push(task);
            }
        } else {
            current.push(task);
        }
    });

    return { currentTasks: current, historyTasks: history };
  }, [selectedMemberId, contentSchedule]);

  // 5. Cálculo de Ranking y Estadísticas MODIFICADO
  const memberStats = useMemo(() => {
    if (selectedMemberId === "all" || contentSchedule.length === 0) return null;

    const myTotalTasks = contentSchedule.filter(t => 
        Array.isArray(t.responsibleIds) && t.responsibleIds.includes(selectedMemberId) && t.isActive
    );
    
    const total = myTotalTasks.length;
    
    // MODIFICADO: Usamos getEffectiveStatus para contar según el estado individual
    const planned = myTotalTasks.filter(t => {
        const s = getEffectiveStatus(t, selectedMemberId);
        return s === "Planeado" || s === "Revisión";
    }).length;
    const inProgress = myTotalTasks.filter(t => getEffectiveStatus(t, selectedMemberId) === "En Progreso").length;
    const published = myTotalTasks.filter(t => getEffectiveStatus(t, selectedMemberId) === "Publicado").length;

    // --- LÓGICA DE RANKING MODIFICADA ---
    const weekInterval = getCustomWeekInterval();
    const now = new Date();
    const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

    const calculateUserScore = (userId: string, interval: { start: Date; end: Date }) => {
        const userTasks = contentSchedule.filter(t => 
            Array.isArray(t.responsibleIds) && t.responsibleIds.includes(userId) && t.isActive &&
            (
                (t.publishDate && isWithinInterval(parseISO(t.publishDate), interval)) ||
                (t.recurrenceDays && t.recurrenceDays.length > 0)
            )
        );
        const total = userTasks.length;
        // MODIFICADO: Contamos completadas usando el estado individual de ESE usuario
        const completed = userTasks.filter(t => getEffectiveStatus(t, userId) === "Publicado").length;
        return total === 0 ? 0 : (completed / total) * 5;
    };

    const allUserIds = Array.from(new Set(contentSchedule.flatMap(c => c.responsibleIds || [])));

    const getRankInfo = (interval: { start: Date; end: Date }) => {
        const scores = allUserIds.map(uid => ({ uid, score: calculateUserScore(uid, interval) }))
                                 .sort((a, b) => b.score - a.score);
        
        const myData = scores.find(s => s.uid === selectedMemberId);
        const myScore = myData ? myData.score : 0;

        const validScores = scores.filter(s => s.score >= 3.0);
        const uniqueTopScores = [...new Set(validScores.map(s => s.score))];
        
        let myRank = null;
        if (myScore >= 3.0) {
            const rankIndex = uniqueTopScores.indexOf(myScore);
            if (rankIndex !== -1 && rankIndex < 3) {
                myRank = rankIndex + 1;
            }
        }
        return { myScore, myRank };
    };

    const weekly = getRankInfo(weekInterval);
    const monthly = getRankInfo(monthInterval);

    return {
        total,
        planned,
        inProgress,
        published,
        weeklyRank: weekly.myRank,
        monthlyRank: monthly.myRank,
        myWeeklyScore: weekly.myScore,
        myMonthlyScore: monthly.myScore,
    };
  }, [contentSchedule, selectedMemberId]);

  // 6. Lógica de Calendario
  const daysWithTasks = (day: Date) => {
    return currentTasks.some(task => {
        if (task.publishDate && isSameDay(parseISO(task.publishDate), day)) return true;
        if (task.recurrenceDays && task.recurrenceDays.length > 0) {
            let taskStart = getSafeDate(task.createdAt);
            if (task.publishDate) taskStart = parseISO(task.publishDate);
            if (isBefore(startOfDay(day), startOfDay(taskStart))) return false;
            const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
            return task.recurrenceDays.includes(daysMap[getDay(day)]);
        }
        return false;
    });
  };

  const tasksForSelectedDate = useMemo(() => {
    if (!monitorDate) return [];
    return currentTasks.filter(task => {
        if (task.publishDate && isSameDay(parseISO(task.publishDate), monitorDate)) return true;
        if (task.recurrenceDays && task.recurrenceDays.length > 0) {
             let taskStart = getSafeDate(task.createdAt);
             if (task.publishDate) taskStart = parseISO(task.publishDate);
             if (isBefore(startOfDay(monitorDate), startOfDay(taskStart))) return false;
             const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
             return task.recurrenceDays.includes(daysMap[getDay(monitorDate)]);
        }
        return false;
    });
  }, [monitorDate, currentTasks]);


  // =========================================================================================
  // MANEJADORES
  // =========================================================================================
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };
  
  const handlePlatformSelect = (platform: string) => {
    setFormState(prev => {
        const current = prev.platform;
        const updated = current.includes(platform) ? current.filter(p => p !== platform) : [...current, platform];
        return { ...prev, platform: updated };
    });
  };

  const handleDaySelect = (day: string) => {
    setFormState(prev => {
        const current = prev.recurrenceDays;
        const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
        return { ...prev, recurrenceDays: updated };
    });
  };

  const handleMultiSelectChange = (userId: string) => {
    setFormState(prev => {
      const newIds = prev.responsibleIds.includes(userId) ? prev.responsibleIds.filter(id => id !== userId) : [...prev.responsibleIds, userId];
      return { ...prev, responsibleIds: newIds };
    });
  };
  
  const resetForm = () => setFormState(initialFormState);
  
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleEditPlatformSelect = (platform: string) => {
    setEditFormState(prev => {
        const current = prev.platform || [];
        const updated = current.includes(platform) ? current.filter(p => p !== platform) : [...current, platform];
        return { ...prev, platform: updated };
    });
  };

  const handleEditDaySelect = (day: string) => {
    setEditFormState(prev => {
        const current = prev.recurrenceDays || [];
        const updated = current.includes(day) ? current.filter(d => d !== day) : [...current, day];
        return { ...prev, recurrenceDays: updated };
    });
  };

  const handleEditMultiSelectChange = (userId: string) => {
    setEditFormState(prev => {
      const newIds = prev.responsibleIds.includes(userId) ? prev.responsibleIds.filter(id => id !== userId) : [...prev.responsibleIds, userId];
      return { ...prev, responsibleIds: newIds };
    });
  };

  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.type || formState.platform.length === 0 || !formState.contentIdea || formState.responsibleIds.length === 0) {
      alert("Completa campos requeridos: Tipo, Plataforma, Idea, Responsables.");
      return;
    }
    try {
      const selectedUsers = team.filter(u => formState.responsibleIds.includes(u.id));
      const selectedEmails = selectedUsers.map(u => u.email);
      await addDoc(collection(db, "contentSchedule"), {
        ...formState,
        responsibleIds: formState.responsibleIds,
        responsibleEmails: selectedEmails,
        status: "Planeado",
        // NUEVO: Inicializamos valores por defecto
        individualStatus: {}, 
        isGroupTask: false, 
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: user?.uid,
      });
      toast.success("Tarea creada exitosamente");
      resetForm();
    } catch (error) { toast.error("Error al crear tarea"); }
  };

  const handleOpenEditModal = (task: Content) => {
    setCurrentTask(task);
    setEditFormState({
      type: task.type,
      platform: task.platform || [],
      recurrenceDays: task.recurrenceDays || [],
      publishDate: task.publishDate || "",
      format: task.format || "",
      objective: task.objective || "",
      audience: task.audience || "",
      contentIdea: task.contentIdea,
      responsibleIds: task.responsibleIds || [],
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;
    try {
      const selectedUsers = team.filter(u => editFormState.responsibleIds.includes(u.id));
      const selectedEmails = selectedUsers.map(u => u.email);
      const contentDocRef = doc(db, "contentSchedule", currentTask.id);
      await updateDoc(contentDocRef, {
        ...editFormState,
        responsibleIds: editFormState.responsibleIds,
        responsibleEmails: selectedEmails,
      });
      toast.success("Tarea actualizada");
      setIsEditModalOpen(false);
      setCurrentTask(null);
    } catch (error) { toast.error("Error al actualizar tarea"); }
  };
  
  const handleToggleActive = async (contentId: string, currentIsActive: boolean) => {
    try {
      const contentDocRef = doc(db, "contentSchedule", contentId);
      await updateDoc(contentDocRef, { isActive: !currentIsActive });
      toast.success(currentIsActive ? "Tarea desactivada" : "Tarea activada");
    } catch (error) { toast.error("Error al cambiar estado"); }
  };

  // --- COMPONENTE: Tarjeta de Tarea MODIFICADA ---
  const TaskCard = ({ item, isHistory = false }: { item: Content, isHistory?: boolean }) => {
    const { isLocked, reason } = getTaskLockStatus(item.publishDate);
    // Usamos el estado efectivo para mostrar
    const currentStatus = getEffectiveStatus(item, user?.uid);

    return (
      <Card className={cn("border-l-4 shadow-sm transition-all", isLocked ? "border-l-muted bg-muted/10" : "border-l-primary")}>
          <CardHeader className="pb-2 pt-4">
              <div className="flex justify-between items-start">
                  <div className="flex-1 mr-2">
                      <CardTitle className="text-lg leading-snug">{item.type}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs mt-1">{item.contentIdea}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                      {isLocked && !isHistory && (
                           <TooltipProvider>
                              <Tooltip>
                                  <TooltipTrigger asChild><div className="p-1"><Info className="h-4 w-4 text-muted-foreground" /></div></TooltipTrigger>
                                  <TooltipContent><p>{reason}</p></TooltipContent>
                              </Tooltip>
                          </TooltipProvider>
                      )}
                      
                      {/* MODIFICADO: Dropdown para cambiar estado */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Badge variant={getStatusVariant(currentStatus)} className="text-[10px] px-1.5 h-5 cursor-pointer hover:opacity-80">
                                {currentStatus}
                            </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, "Planeado", item)}>Planeado</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, "En Progreso", item)}>En Progreso</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(item.id, "Publicado", item)}>Publicado</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                  </div>
              </div>
          </CardHeader>
          <CardContent className="pb-4 pt-0 space-y-3">
              <div className="flex justify-between text-sm mt-2 border-t pt-2">
                  <span className="text-muted-foreground text-xs">Fecha:</span>
                  <span className={cn("font-medium text-xs", isLocked && "text-red-500")}>{item.publishDate || item.recurrenceDays?.join(", ")}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={() => handleOpenEditModal(item)}>
                      <Pencil className="h-3 w-3 mr-1" /> Editar
                  </Button>
              </div>
          </CardContent>
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="flex-1 space-y-8 px-4 py-6 md:px-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard de Contenido
        </h1>

        {/* CARDS DE STATS GENERALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-background shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Contenido Planeado</CardTitle>
              <Clock className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-red-600">{stats.planned}</div></CardContent>
          </Card>
          <Card className="bg-background shadow-sm border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">En Progreso</CardTitle>
              <PlayCircle className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div></CardContent>
          </Card>
          <Card className="bg-background shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Publicados</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-green-600">{stats.published}</div></CardContent>
          </Card>
          <Card className="bg-background shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Miembros Activos</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div></CardContent>
          </Card>
        </div>

        {/* === MONITOR DE DESEMPEÑO INDIVIDUAL (PRO VERSION) === */}
        <Card className="bg-muted/30 border-dashed border-2 relative overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between z-10 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg border shadow-sm">
                           <UserCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Monitor Individual</CardTitle>
                            <CardDescription>Seguimiento detallado por miembro</CardDescription>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="w-full md:w-[280px]">
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Seleccionar miembro..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">-- Seleccionar Usuario --</SelectItem>
                                    {team.map((member) => (
                                        <SelectItem key={member.id} value={member.id}>
                                            {member.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedMemberId !== "all" && (
                            <Button variant="outline" size="icon" onClick={() => setSelectedMemberId("all")} className="bg-background shrink-0">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            {selectedMemberId !== "all" && memberStats && (
                <CardContent className="space-y-6 animate-in slide-in-from-top-4 duration-500 fade-in-20">
                    
                    {/* 1. SECCIÓN DE RANKING (VIP CARDS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {/* Mensual */}
                        <Card className={cn("border-2 relative overflow-hidden", getRankCardStyle(memberStats.monthlyRank))}>
                            <div className="absolute -right-6 -top-6 opacity-25 rotate-12">
                                {memberStats.monthlyRank === 1 ? <Crown className="h-24 w-24" /> : <Award className="h-24 w-24" />}
                            </div>
                            <CardHeader className="pb-2 relative z-10">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                        <Award className="h-4 w-4" /> Ranking Mensual
                                    </CardTitle>
                                    {memberStats.monthlyRank && <Badge className="bg-black/80 text-white border-0">#{memberStats.monthlyRank}</Badge>}
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10 pb-4">
                                <div className="flex items-end gap-2 mb-1">
                                    <span className="text-4xl font-black tracking-tighter">{memberStats.myMonthlyScore.toFixed(1)}</span>
                                    <span className="text-sm font-medium opacity-70 mb-1">/ 5.0</span>
                                </div>
                                <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-current" style={{ width: `${(memberStats.myMonthlyScore / 5) * 100}%` }} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Semanal */}
                        <Card className={cn("border-2 relative overflow-hidden", getRankCardStyle(memberStats.weeklyRank))}>
                            <div className="absolute -right-6 -top-6 opacity-25 rotate-12">
                                {memberStats.weeklyRank === 1 ? <Trophy className="h-24 w-24" /> : <Medal className="h-24 w-24" />}
                            </div>
                            <CardHeader className="pb-2 relative z-10">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                        <Star className="h-4 w-4" /> Ranking Semanal
                                    </CardTitle>
                                    <div className="flex flex-col items-end">
                                        {memberStats.weeklyRank && <Badge className="bg-black/80 text-white border-0 mb-1">#{memberStats.weeklyRank}</Badge>}
                                        <span className="text-[10px] font-mono opacity-70 flex items-center gap-1 font-bold">
                                            <Timer className="h-3 w-3" /> Cierra Lun 8AM
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="relative z-10 pb-4">
                                <div className="flex items-end gap-2 mb-1">
                                    <span className="text-4xl font-black tracking-tighter">{memberStats.myWeeklyScore.toFixed(1)}</span>
                                    <span className="text-sm font-medium opacity-70 mb-1">/ 5.0</span>
                                </div>
                                <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-current" style={{ width: `${(memberStats.myWeeklyScore / 5) * 100}%` }} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                     {/* 2. SECCIÓN DE ESTADÍSTICAS INDIVIDUALES */}
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                        <Card className="bg-background shadow-sm border-l-4 border-l-blue-500">
                             <CardHeader className="p-3 pb-1 md:p-4 md:pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase">Asignadas</CardTitle>
                                <ClipboardList className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                                <div className="text-xl md:text-2xl font-bold text-blue-600">{memberStats.total}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-sm border-l-4 border-l-red-500">
                            <CardHeader className="p-3 pb-1 md:p-4 md:pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase">Pendientes</CardTitle>
                                <Clock className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                                <div className="text-xl md:text-2xl font-bold text-red-600">{memberStats.planned}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-sm border-l-4 border-l-yellow-500">
                             <CardHeader className="p-3 pb-1 md:p-4 md:pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase">En Curso</CardTitle>
                                <PlayCircle className="h-4 w-4 text-yellow-500" />
                            </CardHeader>
                            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                                <div className="text-xl md:text-2xl font-bold text-yellow-600">{memberStats.inProgress}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-sm border-l-4 border-l-green-500">
                             <CardHeader className="p-3 pb-1 md:p-4 md:pb-2 flex flex-row items-center justify-between space-y-0">
                                <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase">Listas</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
                                <div className="text-xl md:text-2xl font-bold text-green-600">{memberStats.published}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 3. TABS COMPLETAS (Lista, Calendario, Historial) */}
                    <Tabs defaultValue="list" className="w-full">
                        <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-2">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                Tareas Asignadas <Badge variant="secondary" className="text-xs">Semana Actual</Badge>
                            </h3>
                            <TabsList className="grid grid-cols-3 w-full md:w-auto">
                                <TabsTrigger value="list"><ListFilter className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Lista</span></TabsTrigger>
                                <TabsTrigger value="calendar"><CalendarDays className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Calendario</span></TabsTrigger>
                                <TabsTrigger value="history"><History className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Historial</span></TabsTrigger>
                            </TabsList>
                        </div>

                        {/* LISTA */}
                        <TabsContent value="list">
                            <Card>
                                <CardContent className="p-0">
                                    {/* Desktop Table */}
                                    <div className="border rounded-lg overflow-x-auto hidden md:block">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Descripción</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {currentTasks.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Sin tareas actuales.</TableCell></TableRow> : 
                                                currentTasks.map(task => {
                                                    const { isLocked, reason } = getTaskLockStatus(task.publishDate);
                                                    const currentStatus = getEffectiveStatus(task, selectedMemberId); // Estado visual
                                                    return (
                                                        <TableRow key={task.id} className={cn(isLocked && "bg-muted/30")}>
                                                            <TableCell className="font-medium">{task.type}</TableCell>
                                                            <TableCell className="max-w-[200px] truncate" title={task.contentIdea}>{task.contentIdea}</TableCell>
                                                            <TableCell>
                                                                <div className="text-sm">{task.publishDate || "N/A"}</div>
                                                                {task.recurrenceDays?.length > 0 && <span className="text-xs text-muted-foreground">{task.recurrenceDays.join(", ")}</span>}
                                                            </TableCell>
                                                            <TableCell>
                                                                {/* MODIFICADO: Dropdown en la tabla */}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Badge variant={getStatusVariant(currentStatus)} className="cursor-pointer hover:opacity-80">
                                                                            {currentStatus}
                                                                        </Badge>
                                                                    </DropdownMenuTrigger>
                                                                    {/* Solo permite editar si estamos viendo NUESTRO propio usuario (o somos admin y queremos forzar, pero aquí asumimos el usuario logueado en la acción) */}
                                                                    <DropdownMenuContent>
                                                                         <DropdownMenuItem onClick={() => handleStatusChange(task.id, "Planeado", task)}>Planeado</DropdownMenuItem>
                                                                         <DropdownMenuItem onClick={() => handleStatusChange(task.id, "En Progreso", task)}>En Progreso</DropdownMenuItem>
                                                                         <DropdownMenuItem onClick={() => handleStatusChange(task.id, "Publicado", task)}>Publicado</DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                            <TableCell>
                                                                {isLocked ? (
                                                                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                                        <Lock className="h-3 w-3" /> Cerrado
                                                                        <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger><TooltipContent>{reason}</TooltipContent></Tooltip></TooltipProvider>
                                                                    </div>
                                                                ) : (
                                                                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(task)}><Pencil className="h-4 w-4" /></Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {/* Mobile Cards */}
                                    <div className="space-y-4 md:hidden p-4">
                                        {currentTasks.length === 0 ? <p className="text-center text-muted-foreground">Sin tareas actuales.</p> : 
                                         currentTasks.map(task => <TaskCard key={task.id} item={task} />)}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* CALENDARIO */}
                        <TabsContent value="calendar">
                             <div className="flex flex-col md:flex-row gap-6">
                                <Card className="flex-shrink-0 md:w-auto"><CardContent className="p-4 flex justify-center"><Calendar mode="single" selected={monitorDate} onSelect={setMonitorDate} className="rounded-md border shadow-sm" modifiers={{ booked: (d) => daysWithTasks(d) }} modifiersClassNames={{ booked: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full font-bold text-primary" }} /></CardContent></Card>
                                <Card className="flex-1 border-dashed bg-muted/20">
                                    <CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="h-4 w-4 text-primary" /> {monitorDate ? format(monitorDate, "EEEE d 'de' MMMM", { locale: es }) : "Selecciona fecha"}</CardTitle></CardHeader>
                                    <CardContent>
                                        {tasksForSelectedDate.length === 0 ? <div className="flex flex-col items-center justify-center py-8 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mb-2 opacity-20" /><p>Nada programado.</p></div> : 
                                         <div className="space-y-4">{tasksForSelectedDate.map(task => <TaskCard key={task.id} item={task} />)}</div>}
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>

                        {/* HISTORIAL */}
                        <TabsContent value="history">
                            <Card>
                                <CardHeader className="pb-2"><CardTitle className="text-sm">Historial de Ciclos Anteriores</CardTitle></CardHeader>
                                <CardContent className="p-0">
                                    <div className="border rounded-lg overflow-x-auto hidden md:block">
                                        <Table>
                                            <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Fecha</TableHead><TableHead>Estado Final</TableHead></TableRow></TableHeader>
                                            <TableBody>
                                                {historyTasks.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8">Historial vacío.</TableCell></TableRow> : 
                                                 historyTasks.map(item => (
                                                    <TableRow key={item.id} className="opacity-70 bg-muted/30">
                                                        <TableCell className="font-medium">{item.type}<div className="text-xs text-muted-foreground truncate w-40">{item.contentIdea}</div></TableCell>
                                                        <TableCell>{item.publishDate}</TableCell>
                                                        <TableCell><Badge variant="outline">{item.status}</Badge></TableCell>
                                                    </TableRow>
                                                 ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    <div className="space-y-4 md:hidden p-4">
                                        {historyTasks.length === 0 ? <p className="text-center text-muted-foreground">Historial vacío.</p> : 
                                         historyTasks.map(item => <div key={item.id} className="opacity-70 grayscale-[0.5]"><TaskCard item={item} isHistory={true} /></div>)}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                </CardContent>
            )}
        </Card>

        {/* --- SECCIÓN DE GESTIÓN GENERAL (ACORDEÓN Y TABLA GLOBAL) --- */}
        {/* Sin cambios mayores aquí, solo referencia a los nuevos campos si es necesario editar */}
        <div className="space-y-8">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5" />
                  <span className="text-lg font-semibold">Crear Nueva Publicación</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {/* --- Formulario de CREAR --- */}
                <form onSubmit={handleSubmitContent} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Publicidad</Label>
                    <Input id="type" value={formState.type} onChange={handleFormChange} placeholder="Ej. Prédica, Versículos, Anuncio" required />
                  </div>
                  
                  {/* SELECCIÓN MÚLTIPLE DE PLATAFORMA */}
                  <div className="space-y-2">
                    <Label>Plataformas</Label>
                    <Popover open={openCreatePlatform} onOpenChange={setOpenCreatePlatform}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between">
                                <span className="truncate">
                                    {formState.platform.length === 0 ? "Seleccionar..." : formState.platform.join(", ")}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandGroup>
                                    {PLATFORMS_LIST.map((plat) => (
                                        <CommandItem key={plat} value={plat} onSelect={() => handlePlatformSelect(plat)}>
                                            <Check className={cn("mr-2 h-4 w-4", formState.platform.includes(plat) ? "opacity-100" : "opacity-0")} />
                                            {plat}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                  </div>

                  {/* SELECCIÓN DE DÍAS */}
                  <div className="md:col-span-2 space-y-3 border p-4 rounded-lg bg-muted/10">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-base font-medium">Días de Repetición (Para tareas semanales)</Label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_LIST.map((day) => {
                            const isSelected = formState.recurrenceDays.includes(day);
                            return (
                                <Button
                                    key={day}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleDaySelect(day)}
                                    className={cn("transition-all", isSelected ? "border-primary" : "text-muted-foreground")}
                                >
                                    {isSelected && <Check className="mr-1 h-3 w-3" />}
                                    {day}
                                </Button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-muted-foreground">Selecciona los días si la tarea se repite (Ej. Versículos diarios).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publishDate">Fecha de Inicio / Publicación</Label>
                    <Input id="publishDate" value={formState.publishDate} onChange={handleFormChange} type="date" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="format">Formato</Label>
                    <Input id="format" value={formState.format} onChange={handleFormChange} placeholder="Ej. Reel, Post, Video largo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="objective">Objetivo</Label>
                    <Input id="objective" value={formState.objective} onChange={handleFormChange} placeholder="Ej. Alcanzar 1000 vistas" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="audience">Público Objetivo</Label>
                    <Input id="audience" value={formState.audience} onChange={handleFormChange} placeholder="Ej. Jóvenes, General" />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="contentIdea">Idea del Contenido</Label>
                    <Textarea id="contentIdea" value={formState.contentIdea} onChange={handleFormChange} placeholder="Detalles, texto, etc." required />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label>Responsable(s)</Label>
                    <Popover open={openCreateMultiSelect} onOpenChange={setOpenCreateMultiSelect}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                          <span className="truncate">
                            {formState.responsibleIds.length === 0 && "Seleccionar miembros..."}
                            {formState.responsibleIds.length === 1 && team.find(t => t.id === formState.responsibleIds[0])?.email}
                            {formState.responsibleIds.length > 1 && `${formState.responsibleIds.length} miembros seleccionados`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar miembro..." />
                          <CommandList>
                            <CommandEmpty>No se encontraron miembros.</CommandEmpty>
                            <CommandGroup>
                              {team.map(member => (
                                <CommandItem key={member.id} value={member.email} onSelect={() => {
                                    handleMultiSelectChange(member.id);
                                    setOpenCreateMultiSelect(true); // Mantener abierto
                                  }}>
                                  <Check className={cn("mr-2 h-4 w-4", formState.responsibleIds.includes(member.id) ? "opacity-100" : "opacity-0")} />
                                  {member.email}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button type="submit" className="md:col-span-2 w-full">Crear Publicación</Button>
                </form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Tabla de Contenido General */}
          <Card>
            <CardHeader>
              <CardTitle>Historial Global</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contenido</TableHead>
                      <TableHead>Responsable(s)</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Publicar / Días</TableHead>
                      <TableHead>Progreso</TableHead>
                      <TableHead>Editar</TableHead>
                      <TableHead className="text-right">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={7} className="text-center">Cargando...</TableCell></TableRow>
                    ) : contentSchedule.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center">No hay contenido.</TableCell></TableRow>
                    ) : (
                      contentSchedule.map(item => (
                        <TableRow key={item.id} className={!item.isActive ? "opacity-50" : ""}>
                          <TableCell className="font-medium">{item.type}</TableCell>
                          <TableCell className="max-w-xs truncate">
                            {item.responsibleEmails?.join(", ") || "N/A"}
                          </TableCell>
                          <TableCell>
                            {item.platform && item.platform.length > 0 ? item.platform.join(", ") : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                                <span>{item.publishDate || "N/A"}</span>
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
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <Label htmlFor={`switch-${item.id}`} className="text-muted-foreground">
                                {item.isActive ? "Activo" : "Inactivo"}
                              </Label>
                              <Switch
                                id={`switch-${item.id}`}
                                checked={item.isActive}
                                onCheckedChange={() => handleToggleActive(item.id, item.isActive)}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              <div className="space-y-4 md:hidden">
                {/* ... (Mobile card view) similar al de arriba pero en Card */}
                {/* Por brevedad, se mantiene el código existente aquí, 
                    ya que la lógica principal de visualización está cubierta */}
                 {loading ? (
                  <p className="text-center">Cargando...</p>
                ) : contentSchedule.length === 0 ? (
                  <p className="text-center">No hay contenido.</p>
                ) : (
                  contentSchedule.map(item => (
                    <Card key={item.id} className={cn("w-full", !item.isActive && "opacity-60")}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{item.type}</CardTitle>
                            <CardDescription className="pt-1">
                              {item.responsibleEmails?.join(", ") || "N/A"}
                            </CardDescription>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Plataforma:</span>
                          <span className="font-semibold">{item.platform?.join(", ")}</span>
                        </div>
                        {/* ... Resto de la card móvil ... */}
                         <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Progreso:</span>
                          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                           <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                            <Switch
                                id={`switch-mobile-${item.id}`}
                                checked={item.isActive}
                                onCheckedChange={() => handleToggleActive(item.id, item.isActive)}
                              />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MODAL DE EDICIÓN (Mantenemos el existente) */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[425px] md:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Editar Tarea</DialogTitle>
                <DialogDescription>
                Realiza cambios a la tarea. Haz clic en "Actualizar" al terminar.
                </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdateTask} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                <div className="space-y-2">
                <Label htmlFor="edit-type">Tipo de Publicidad</Label>
                <Input id="type" value={editFormState.type} onChange={handleEditFormChange} required />
                </div>
                
                {/* EDITAR: PLATAFORMA MULTI-SELECT */}
                <div className="space-y-2">
                <Label>Plataformas</Label>
                <Popover open={openEditPlatform} onOpenChange={setOpenEditPlatform}>
                    <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                            <span className="truncate">
                                {!editFormState.platform || editFormState.platform.length === 0 
                                    ? "Seleccionar..." 
                                    : editFormState.platform.join(", ")}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                            <CommandGroup>
                                {PLATFORMS_LIST.map((plat) => (
                                    <CommandItem key={plat} value={plat} onSelect={() => handleEditPlatformSelect(plat)}>
                                        <Check className={cn("mr-2 h-4 w-4", (editFormState.platform || []).includes(plat) ? "opacity-100" : "opacity-0")} />
                                        {plat}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </Command>
                    </PopoverContent>
                </Popover>
                </div>

                {/* EDITAR: DÍAS */}
                <div className="md:col-span-2 space-y-3 border p-4 rounded-lg bg-muted/10">
                    <Label className="text-base font-medium">Días de Repetición</Label>
                    <div className="flex flex-wrap gap-2">
                        {DAYS_LIST.map((day) => {
                            const isSelected = (editFormState.recurrenceDays || []).includes(day);
                            return (
                                <Button
                                    key={day}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleEditDaySelect(day)}
                                    className={cn("transition-all", isSelected ? "border-primary" : "text-muted-foreground")}
                                >
                                    {isSelected && <Check className="mr-1 h-3 w-3" />}
                                    {day}
                                </Button>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-2">
                <Label htmlFor="edit-publishDate">Fecha de Publicación</Label>
                <Input id="publishDate" value={editFormState.publishDate} onChange={handleEditFormChange} type="date" />
                </div>
                <div className="space-y-2">
                <Label htmlFor="edit-format">Formato</Label>
                <Input id="format" value={editFormState.format} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="edit-objective">Objetivo</Label>
                <Input id="objective" value={editFormState.objective} onChange={handleEditFormChange} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="edit-audience">Público Objetivo</Label>
                <Input id="audience" value={editFormState.audience} onChange={handleEditFormChange} />
                </div>
                <div className="md:col-span-2 space-y-2">
                <Label htmlFor="edit-contentIdea">Idea del Contenido</Label>
                <Textarea id="contentIdea" value={editFormState.contentIdea} onChange={handleEditFormChange} required />
                </div>
                <div className="md:col-span-2 space-y-2">
                <Label>Responsable(s)</Label>
                <Popover open={openEditMultiSelect} onOpenChange={setOpenEditMultiSelect}>
                    <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                        <span className="truncate">
                        {editFormState.responsibleIds.length === 0 && "Seleccionar miembros..."}
                        {editFormState.responsibleIds.length === 1 && team.find(t => t.id === editFormState.responsibleIds[0])?.email}
                        {editFormState.responsibleIds.length > 1 && `${editFormState.responsibleIds.length} miembros seleccionados`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar miembro..." />
                        <CommandList>
                        <CommandEmpty>No se encontraron miembros.</CommandEmpty>
                        <CommandGroup>
                            {team.map(member => (
                            <CommandItem key={member.id} value={member.email} onSelect={() => {
                                handleEditMultiSelectChange(member.id);
                                setOpenEditMultiSelect(true); // Mantener abierto
                                }}>
                                <Check className={cn("mr-2 h-4 w-4", editFormState.responsibleIds.includes(member.id) ? "opacity-100" : "opacity-0")} />
                                {member.email}
                            </CommandItem>
                            ))}
                        </CommandGroup>
                        </CommandList>
                    </Command>
                    </PopoverContent>
                </Popover>
                </div>
                <DialogFooter className="md:col-span-2">
                <DialogClose asChild>
                    <Button type="button" variant="ghost">Cancelar</Button>
                </DialogClose>
                <Button type="submit">Actualizar Tarea</Button>
                </DialogFooter>
            </form>
            </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
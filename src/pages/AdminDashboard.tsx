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
import { collection, addDoc, getDocs, doc, query, Timestamp, onSnapshot, orderBy, updateDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { 
  PlusCircle, Users, BarChart, Clock, CheckCircle, 
  ChevronsUpDown, Check, Pencil, UserCheck, Filter, 
  X, ClipboardList, PlayCircle, CheckCircle2, CalendarDays,
  Trophy, Star
} from "lucide-react"; 
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";

interface TeamUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

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
  isActive: boolean;
  createdAt: Timestamp;
}

const PLATFORMS_LIST = ["Facebook", "Instagram", "Whatsapp"];
const DAYS_LIST = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const AdminDashboard = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [contentSchedule, setContentSchedule] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  const [openCreateMultiSelect, setOpenCreateMultiSelect] = useState(false);
  const [openEditMultiSelect, setOpenEditMultiSelect] = useState(false);
  const [openCreatePlatform, setOpenCreatePlatform] = useState(false);
  const [openEditPlatform, setOpenEditPlatform] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Content | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");

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
  
  const [editFormState, setEditFormState] = useState<Omit<Content, "id" | "responsibleEmails" | "status" | "isActive" | "createdAt">>({
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

  useEffect(() => {
    const fetchTeam = async () => {
      const usersQuery = query(collection(db, "users"));
      const querySnapshot = await getDocs(usersQuery);
      const teamMembers: TeamUser[] = [];
      querySnapshot.forEach((doc) => {
        teamMembers.push({ id: doc.id, ...(doc.data() as Omit<TeamUser, "id">) });
      });
      setTeam(teamMembers);
      setStats(s => ({ ...s, totalUsers: teamMembers.length }));
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
            createdAt: data.createdAt 
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
    });

    return () => unsubscribe();
  }, []);

  // --- CÁLCULOS DERIVADOS PARA EL MONITOR INDIVIDUAL ---
  const memberStats = useMemo(() => {
    if (selectedMemberId === "all") return null;

    const memberTasks = contentSchedule.filter(t => 
      (t.responsibleIds || []).includes(selectedMemberId) && t.isActive
    );

    // --- LÓGICA DE CALIFICACIÓN SEMANAL ---
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); 
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const weeklyTasks = memberTasks.filter(task => {
        if (task.recurrenceDays && task.recurrenceDays.length > 0) {
            return true;
        }
        if (task.publishDate) {
            const date = parseISO(task.publishDate);
            return isWithinInterval(date, { start, end });
        }
        return false;
    });

    const weeklyTotal = weeklyTasks.length;
    const weeklyCompleted = weeklyTasks.filter(t => t.status === "Publicado").length;
    
    let score = 0;
    if (weeklyTotal > 0) {
        score = (weeklyCompleted / weeklyTotal) * 5;
    }

    let message = "Sin actividad";
    let color = "text-muted-foreground";
    if (weeklyTotal > 0) {
        if (score >= 4.5) { message = "¡Excelente!"; color = "text-green-600"; }
        else if (score >= 3.5) { message = "Buen trabajo"; color = "text-blue-600"; }
        else if (score >= 2.5) { message = "Puede mejorar"; color = "text-yellow-600"; }
        else { message = "Atención"; color = "text-red-600"; }
    }

    return {
      total: memberTasks.length,
      planned: memberTasks.filter(t => t.status === "Planeado" || t.status === "Revisión").length,
      inProgress: memberTasks.filter(t => t.status === "En Progreso").length,
      published: memberTasks.filter(t => t.status === "Publicado").length,
      tasks: memberTasks,
      weekly: {
        total: weeklyTotal,
        completed: weeklyCompleted,
        score: score.toFixed(1),
        message,
        color
      }
    };
  }, [selectedMemberId, contentSchedule]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };
  
  const handlePlatformSelect = (platform: string) => {
    setFormState(prev => {
        const current = prev.platform;
        const updated = current.includes(platform)
            ? current.filter(p => p !== platform)
            : [...current, platform];
        return { ...prev, platform: updated };
    });
  };

  const handleDaySelect = (day: string) => {
    setFormState(prev => {
        const current = prev.recurrenceDays;
        const updated = current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day];
        return { ...prev, recurrenceDays: updated };
    });
  };

  const handleMultiSelectChange = (userId: string) => {
    setFormState(prev => {
      const newIds = prev.responsibleIds.includes(userId)
        ? prev.responsibleIds.filter(id => id !== userId)
        : [...prev.responsibleIds, userId];
      return { ...prev, responsibleIds: newIds };
    });
  };
  
  const resetForm = () => {
     setFormState(initialFormState);
  };
  
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleEditPlatformSelect = (platform: string) => {
    setEditFormState(prev => {
        const current = prev.platform || [];
        const updated = current.includes(platform)
            ? current.filter(p => p !== platform)
            : [...current, platform];
        return { ...prev, platform: updated };
    });
  };

  const handleEditDaySelect = (day: string) => {
    setEditFormState(prev => {
        const current = prev.recurrenceDays || [];
        const updated = current.includes(day)
            ? current.filter(d => d !== day)
            : [...current, day];
        return { ...prev, recurrenceDays: updated };
    });
  };

  const handleEditMultiSelectChange = (userId: string) => {
    setEditFormState(prev => {
      const newIds = prev.responsibleIds.includes(userId)
        ? prev.responsibleIds.filter(id => id !== userId)
        : [...prev.responsibleIds, userId];
      return { ...prev, responsibleIds: newIds };
    });
  };

  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.type || formState.platform.length === 0 || !formState.contentIdea || formState.responsibleIds.length === 0) {
      alert("Por favor, completa los campos requeridos (Tipo, Plataforma, Idea, Responsables).");
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
        isActive: true,
        createdAt: Timestamp.now(),
        createdBy: user?.uid,
      });

      toast.success("Has creado una nueva tarea");
      resetForm();
    } catch (error) {
      console.error("Error al crear contenido: ", error);
      toast.error("Error al crear la tarea");
    }
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
      
      const updateData = {
        ...editFormState,
        responsibleIds: editFormState.responsibleIds,
        responsibleEmails: selectedEmails,
      };

      await updateDoc(contentDocRef, updateData);

      toast.success("Has actualizado la tarea");
      setIsEditModalOpen(false);
      setCurrentTask(null);
    } catch (error) {
      console.error("Error al actualizar la tarea: ", error);
      toast.error("Error al actualizar la tarea");
    }
  };
  
  const handleToggleActive = async (contentId: string, currentIsActive: boolean) => {
    try {
      const contentDocRef = doc(db, "contentSchedule", contentId);
      const newState = !currentIsActive;
      
      await updateDoc(contentDocRef, {
        isActive: newState
      });

      if (newState) {
        toast.success("Has activado una tarea");
      } else {
        toast.success("Has desactivado una tarea");
      }

    } catch (error) {
      console.error("Error al actualizar estado: ", error);
      toast.error("Error al cambiar el estado");
    }
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
    <AdminLayout>
      <div className="flex-1 space-y-8 px-4 py-6 md:px-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard de Contenido
        </h1>

        {/* CARDS DE STATS GENERALES - DISEÑO UNIFICADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Planeado */}
          <Card className="bg-background shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Contenido Planeado</CardTitle>
              <Clock className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.planned}</div>
            </CardContent>
          </Card>

          {/* En Progreso */}
          <Card className="bg-background shadow-sm border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">En Progreso</CardTitle>
              <PlayCircle className="h-5 w-5 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            </CardContent>
          </Card>

          {/* Publicados */}
          <Card className="bg-background shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Publicados</CardTitle>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            </CardContent>
          </Card>

          {/* Miembros */}
          <Card className="bg-background shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Miembros Activos</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* === MONITOR DE DESEMPEÑO INDIVIDUAL === */}
        <Card className="bg-muted/30 border-dashed border-2 relative overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between z-10 relative">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-background rounded-lg border shadow-sm">
                           <UserCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Monitor Individual</CardTitle>
                            <CardDescription>Despliegue de métricas por miembro</CardDescription>
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
                            <Button 
                                variant="outline" 
                                size="icon" 
                                onClick={() => setSelectedMemberId("all")}
                                className="bg-background shrink-0"
                                title="Cerrar vista"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </CardHeader>
            
            {selectedMemberId !== "all" && memberStats && (
                <CardContent className="space-y-6 animate-in slide-in-from-top-4 duration-500 fade-in-20">
                    
                    {/* GRIDS CON CARD DE CALIFICACIÓN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                        
                        {/* === CARD CALIFICACIÓN SEMANAL === */}
                        <Card className="bg-gradient-to-br from-background to-muted border-2 border-primary/20 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <Trophy className="h-12 w-12 text-primary" />
                            </div>
                            <CardHeader className="pb-2 px-4 pt-4">
                                <CardTitle className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                    Calif. Semanal
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                <div className="flex items-end gap-2">
                                    <div className={cn("text-3xl font-bold", memberStats.weekly.color)}>
                                        {memberStats.weekly.score}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-1 font-medium">
                                        / 5.0
                                    </div>
                                </div>
                                <p className={cn("text-[10px] font-semibold mt-1 truncate", memberStats.weekly.color)}>
                                    {memberStats.weekly.message}
                                </p>
                                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className={cn("h-full transition-all duration-500", memberStats.weekly.score === "5.0" ? "bg-green-500" : "bg-primary")} 
                                        style={{ width: `${(parseFloat(memberStats.weekly.score) / 5) * 100}%` }}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* --- RESTO DE CARDS (Estilo unificado) --- */}
                        <Card className="bg-background shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Asignadas</CardTitle>
                                <ClipboardList className="h-5 w-5 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-blue-600">{memberStats.total}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-sm border-l-4 border-l-red-500 hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Pendientes</CardTitle>
                                <Clock className="h-5 w-5 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600">{memberStats.planned}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-sm border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">En Curso</CardTitle>
                                <PlayCircle className="h-5 w-5 text-yellow-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-yellow-600">{memberStats.inProgress}</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-background shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                             <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Listas</CardTitle>
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-green-600">{memberStats.published}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* LISTA DE TAREAS (Tabla en PC, Cards en Móvil) */}
                    <div className="space-y-4">
                        
                        {/* 1. VISTA DE TABLA (Solo Desktop) */}
                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden hidden md:block">
                            <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm">
                                    Tareas de {team.find(t => t.id === selectedMemberId)?.email}
                                </h3>
                            </div>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Idea / Descripción</TableHead>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead className="text-right">Estado Actual</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {memberStats.tasks.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                <div className="flex flex-col items-center gap-2">
                                                    <CheckCircle className="h-8 w-8 text-muted-foreground/30" />
                                                    <span>Todo limpio. No hay tareas activas asignadas.</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        memberStats.tasks.map(task => (
                                            <TableRow key={task.id} className="hover:bg-muted/50">
                                                <TableCell className="font-medium">{task.type}</TableCell>
                                                <TableCell className="text-muted-foreground max-w-[200px] md:max-w-[300px] truncate" title={task.contentIdea}>
                                                    {task.contentIdea}
                                                </TableCell>
                                                <TableCell>{task.publishDate || <span className="text-muted-foreground text-xs italic">Sin fecha</span>}</TableCell>
                                                <TableCell className="text-right">
                                                     <Badge variant={getStatusVariant(task.status)} className="shadow-none">{task.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* 2. VISTA DE CARDS (Solo Móvil) */}
                        <div className="space-y-4 md:hidden">
                            <div className="flex items-center gap-2 px-1 mb-2">
                                <Filter className="h-4 w-4 text-muted-foreground" />
                                <h3 className="font-semibold text-sm">
                                    Tareas de {team.find(t => t.id === selectedMemberId)?.email}
                                </h3>
                            </div>
                            
                            {memberStats.tasks.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8 border rounded-lg bg-muted/10">
                                    <CheckCircle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                                    <span>Todo limpio. Sin tareas.</span>
                                </div>
                            ) : (
                                memberStats.tasks.map(task => (
                                    <Card key={task.id} className="w-full border-l-4 border-l-primary shadow-sm">
                                        <CardHeader className="pb-2">
                                            <div className="flex justify-between items-start">
                                                <CardTitle className="text-lg">{task.type}</CardTitle>
                                                <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3 pt-2">
                                            <div className="text-sm text-muted-foreground line-clamp-3">
                                                {task.contentIdea}
                                            </div>
                                            <div className="flex justify-between text-sm border-t pt-2 mt-2">
                                                <span className="font-medium text-muted-foreground">Fecha:</span>
                                                <span>{task.publishDate || "Sin fecha"}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>

                    </div>
                </CardContent>
            )}
        </Card>

        {/* Formulario desplegable y Tabla General */}
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
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Publicar:</span>
                          <div className="text-right">
                             <span className="font-semibold block">{item.publishDate || "N/A"}</span>
                             {item.recurrenceDays && item.recurrenceDays.length > 0 && (
                                <span className="text-xs text-muted-foreground block">
                                    {item.recurrenceDays.length === 7 ? "Diario" : item.recurrenceDays.join(", ")}
                                </span>
                             )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Progreso:</span>
                          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                           <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                           <div className="flex items-center space-x-2">
                              <Label htmlFor={`switch-mobile-${item.id}`} className="text-sm">
                                {item.isActive ? "Activo" : "Inactivo"}
                              </Label>
                              <Switch
                                id={`switch-mobile-${item.id}`}
                                checked={item.isActive}
                                onCheckedChange={() => handleToggleActive(item.id, item.isActive)}
                              />
                            </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MODAL DE EDICIÓN */}
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
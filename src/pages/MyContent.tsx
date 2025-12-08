// src/pages/MyContent.tsx
import * as React from "react";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom"; 
import { UserLayout } from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, orderBy, where } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { 
  Clock, PlayCircle, CheckCircle2, Lock, Trophy, Star, CalendarDays,
  ListFilter, Medal, Award, ChevronUp, Info, Crown, Timer, History, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  addDays, isAfter, parseISO, startOfWeek, endOfWeek, startOfMonth, 
  endOfMonth, isWithinInterval, format, isSameDay, startOfDay, 
  isBefore, set, getDay, subWeeks, addWeeks
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
  individualStatus?: { [key: string]: string }; // Mapa de estados por usuario
  isGroupTask?: boolean; // Flag para tareas compartidas (Ej. Versículos)
  createdAt: Timestamp;
}

const MyContent = () => {
  const { user } = useAuth();
  const location = useLocation(); 
  
  // --- ESTADOS ---
  const [myTasks, setMyTasks] = useState<Content[]>([]); 
  const [allTasks, setAllTasks] = useState<Content[]>([]); 
  const [rankingHistory, setRankingHistory] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [showAchievements, setShowAchievements] = useState(false);
  const [stats, setStats] = useState({
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
  });

  // 1. CARGA TUS TAREAS (Filtradas por usuario)
  useEffect(() => {
    if (!user) return;
    setLoading(true);

    const userQuery = query(
      collection(db, "contentSchedule"),
      where("responsibleIds", "array-contains", user.uid),
      where("isActive", "==", true),
      orderBy("publishDate", "desc")
    );

    const unsubscribe = onSnapshot(userQuery, (snapshot) => {
      const data: Content[] = [];
      snapshot.forEach((doc) => {
        const d = doc.data();
        const normalizedPlatform = Array.isArray(d.platform) ? d.platform : (d.platform ? [d.platform] : []);
        data.push({ 
            id: doc.id, 
            ...d, 
            platform: normalizedPlatform, 
            recurrenceDays: d.recurrenceDays || [],
            individualStatus: d.individualStatus || {}, // Asegurar que exista
            isGroupTask: d.isGroupTask || false 
        } as Content);
      });
      setMyTasks(data);
      setLoading(false);
    }, (error) => {
        console.error("Error cargando tus tareas:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // 2. CARGA GLOBAL (Para ranking en tiempo real)
  useEffect(() => {
    const globalQuery = query(collection(db, "contentSchedule"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(globalQuery, (snapshot) => {
        const data: Content[] = [];
        snapshot.forEach((doc) => {
            const d = doc.data();
            data.push({ 
              id: doc.id, 
              ...d, 
              responsibleIds: d.responsibleIds || [], 
              recurrenceDays: d.recurrenceDays || [], 
              individualStatus: d.individualStatus || {}, 
              isGroupTask: d.isGroupTask || false 
            } as Content);
        });
        setAllTasks(data);
    }, (error) => console.log("Modo restringido"));
    return () => unsubscribe();
  }, []);

  // 3. CARGA HISTORIAL DE RANKINGS
  useEffect(() => {
    const rankingQuery = query(collection(db, "monthlyRankings"), orderBy("dateProcessed", "desc"));
    const unsubscribe = onSnapshot(rankingQuery, (snapshot) => {
        const historyData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRankingHistory(historyData);
    });
    return () => unsubscribe();
  }, []);

  // --- LÓGICA DE FECHAS (Semana inicia Lunes 8:00 AM) ---
  const getCycleStart = () => {
      const now = new Date();
      let start = startOfWeek(now, { weekStartsOn: 1 });
      start = set(start, { hours: 8, minutes: 0, seconds: 0, milliseconds: 0 });
      if (isBefore(now, start)) {
          start = subWeeks(start, 1);
      }
      return start;
  };

  // --- HELPER CRÍTICO CORREGIDO: Recuperar estado con fallback al global ---
  const getMyStatus = (task: Content, uid?: string) => {
      const targetUser = uid || user?.uid;
      if (!targetUser) return "Planeado";
      
      // 1. Si es grupal (Versículos), manda el global
      if (task.isGroupTask) return task.status;

      // 2. Si es individual, busca mi estado. 
      // IMPORTANTE: Si no existe individualStatus, usa task.status (global) como respaldo.
      // Esto arregla el problema de las tareas antiguas que salían en 0.
      return task.individualStatus?.[targetUser] || task.status || "Planeado";
  };

  // Separar Tareas (Actuales vs Historial)
  const { currentTasks, historyTasks } = useMemo(() => {
      const cycleStart = getCycleStart(); 
      const cycleStartDay = startOfDay(cycleStart);

      const current: Content[] = [];
      const history: Content[] = [];

      myTasks.forEach(task => {
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
  }, [myTasks]);

  // Stats Locales
  useEffect(() => {
      let pending = 0, inProgress = 0, completed = 0;
      currentTasks.forEach(t => {
        const s = getMyStatus(t); // Usamos el helper corregido
        if (s === "Planeado" || s === "Revisión") pending++;
        if (s === "En Progreso") inProgress++;
        if (s === "Publicado") completed++;
      });
      setStats({ pendingTasks: pending, inProgressTasks: inProgress, completedTasks: completed });
  }, [currentTasks, user]); 

  // --- LOGICA DE ACTUALIZACIÓN DE ESTADO ---
  const handleStatusChange = async (task: Content, newStatus: string) => {
    if (!user) return;
    try {
      const contentDocRef = doc(db, "contentSchedule", task.id);
      
      // LÓGICA CRÍTICA:
      if (task.isGroupTask) {
         // Si es la excepción (Versículos), actualizamos el campo 'status' GLOBAL
         await updateDoc(contentDocRef, { status: newStatus });
      } else {
         // Si es una tarea normal, actualizamos SOLO el campo individual del usuario
         await updateDoc(contentDocRef, { 
             [`individualStatus.${user.uid}`]: newStatus 
         });
      }
    } catch (error) { 
        console.error("Error updating status: ", error); 
    }
  };

  // --- RANKING EN TIEMPO REAL ---
  const achievements = useMemo(() => {
    // Usamos allTasks para comparar con otros, o myTasks si falla
    const sourceData = allTasks.length > 0 ? allTasks : myTasks;
    if (!user || sourceData.length === 0) return { 
        weeklyRank: null, monthlyRank: null, 
        myWeeklyScore: 0, myMonthlyScore: 0,
        weeklyMsg: "Calculando...", monthlyMsg: "Calculando..." 
    };

    const start = getCycleStart(); 
    const end = addWeeks(start, 1);
    const weekInterval = { start, end };
    
    const now = new Date();
    const monthInterval = { start: startOfMonth(now), end: endOfMonth(now) };

    const calculateUserScore = (userId: string, interval: { start: Date; end: Date }) => {
        const userTasks = sourceData.filter(t => 
            t.responsibleIds.includes(userId) &&
            (
                (t.publishDate && isWithinInterval(parseISO(t.publishDate), interval)) ||
                (t.recurrenceDays && t.recurrenceDays.length > 0 && t.isActive)
            )
        );
        const total = userTasks.length;
        
        // CORRECCIÓN: Usa getMyStatus pasando el userId para ver si cuenta
        const completed = userTasks.filter(t => {
            const effectiveStatus = getMyStatus(t, userId);
            return effectiveStatus === "Publicado";
        }).length;

        return total === 0 ? 0 : (completed / total) * 5;
    };

    const allUserIds = Array.from(new Set(sourceData.flatMap(c => c.responsibleIds)));

    const getRankInfo = (interval: { start: Date; end: Date }) => {
        const scores = allUserIds.map(uid => ({ uid, score: calculateUserScore(uid, interval) }))
                                 .sort((a, b) => b.score - a.score);
        
        const myData = scores.find(s => s.uid === user.uid);
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

    const getMsg = (rank: number | null, score: number, type: "semana" | "mes") => {
        const period = type === "semana" ? "esta semana" : "este mes";
        if (rank && rank <= 3) return `Eres el número ${rank} del Top 3 de ${period}. ¡Sigue así!`;
        if (score < 3) return `Nota: ${score.toFixed(1)}. ¡Necesitas 3.0 para clasificar!`;
        return `Nota: ${score.toFixed(1)}. ¡Sigue así para entrar al Top 3!`;
    };

    return {
        weeklyRank: weekly.myRank,
        monthlyRank: monthly.myRank,
        myWeeklyScore: weekly.myScore,
        myMonthlyScore: monthly.myScore,
        weeklyMsg: getMsg(weekly.myRank, weekly.myScore, "semana"),
        monthlyMsg: getMsg(monthly.myRank, monthly.myScore, "mes")
    };
  }, [allTasks, myTasks, user]);

  // --- UI HELPERS ---
  const getTaskLockStatus = (publishDateString: string) => {
    if (!publishDateString) return { isLocked: false, reason: "" };
    const now = new Date();
    const publishDate = parseISO(publishDateString);
    const dayOfWeek = getDay(publishDate); 
    let deadline: Date;
    let reason = "";

    if (dayOfWeek === 0) { 
      deadline = set(addDays(publishDate, 1), { hours: 8, minutes: 0, seconds: 0 });
      reason = "Cierre de ciclo: Lunes 8:00 AM";
    } else {
      deadline = set(addDays(publishDate, 1), { hours: 23, minutes: 59, seconds: 59 });
      reason = "Plazo de 24h vencido.";
    }
    return { isLocked: isAfter(now, deadline), reason };
  };

  const getStatusVariant = (status: string) => {
    switch (status) { case 'Publicado': return 'default'; case 'En Progreso': return 'secondary'; case 'Planeado': return 'destructive'; default: return 'outline'; }
  };

  const getRankCardStyle = (rank: number | null) => {
      if (rank === 1) return "bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-100 border-yellow-500 text-yellow-950 shadow-lg shadow-yellow-500/30"; 
      if (rank === 2) return "bg-gradient-to-br from-slate-200 via-slate-300 to-slate-100 border-slate-500 text-slate-900 shadow-lg shadow-slate-500/30"; 
      if (rank === 3) return "bg-gradient-to-br from-orange-200 via-orange-300 to-orange-100 border-orange-600 text-orange-950 shadow-lg shadow-orange-500/30"; 
      return "bg-background border-muted text-foreground";
  };

  // --- DEEP LINKING ---
  useEffect(() => {
    if (!loading && myTasks.length > 0) {
        const params = new URLSearchParams(location.search);
        const taskId = params.get("taskId"); 
        if (taskId) {
            setTimeout(() => {
                const element = document.getElementById(`task-${taskId}`);
                if (element) {
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                    element.classList.add("ring-2", "ring-primary", "bg-accent/30");
                    setTimeout(() => element.classList.remove("ring-2", "ring-primary", "bg-accent/30"), 3000);
                }
            }, 500);
        }
    }
  }, [loading, myTasks, location.search]);

  // --- CALENDARIO HELPERS ---
  const daysWithTasks = (day: Date) => {
      return currentTasks.some(task => {
          if (task.publishDate && isSameDay(parseISO(task.publishDate), day)) return true;
          if (task.recurrenceDays && task.recurrenceDays.length > 0) {
              let taskStart = task.createdAt ? task.createdAt.toDate() : new Date();
              if (task.publishDate) taskStart = parseISO(task.publishDate);
              if (isBefore(startOfDay(day), startOfDay(taskStart))) return false;
              const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
              return task.recurrenceDays.includes(daysMap[getDay(day)]);
          }
          return false;
      });
  };

  const tasksForSelectedDate = useMemo(() => {
    if (!date) return [];
    return currentTasks.filter(task => {
        if (task.publishDate && isSameDay(parseISO(task.publishDate), date)) return true;
        if (task.recurrenceDays && task.recurrenceDays.length > 0) {
             let taskStart = task.createdAt ? task.createdAt.toDate() : new Date();
             if (task.publishDate) taskStart = parseISO(task.publishDate);
             if (isBefore(startOfDay(date), startOfDay(taskStart))) return false;
             const daysMap = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
             return task.recurrenceDays.includes(daysMap[getDay(date)]);
        }
        return false;
    });
  }, [date, currentTasks]);

  // --- COMPONENTE CARD MÓVIL ---
  const TaskCard = ({ item, isHistory = false }: { item: Content, isHistory?: boolean }) => {
      const { isLocked, reason } = getTaskLockStatus(item.publishDate);
      const currentStatus = getMyStatus(item); // Usar estado correcto

      return (
        <Card key={item.id} id={`task-${item.id}`} className={cn("border-l-4 shadow-sm transition-all", isLocked ? "border-l-muted bg-muted/10" : "border-l-primary")}>
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
                        <Badge variant={getStatusVariant(currentStatus)} className="text-[10px] px-1.5 h-5">{currentStatus}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pb-4 pt-0 space-y-3">
                <div className="flex justify-between text-sm mt-2 border-t pt-2">
                    <span className="text-muted-foreground text-xs">Fecha:</span>
                    <span className={cn("font-medium text-xs", isLocked && "text-red-500")}>{item.publishDate || item.recurrenceDays?.join(", ")}</span>
                </div>
                {isLocked ? (
                    <div className="w-full bg-muted/50 text-muted-foreground text-center py-1.5 rounded text-xs flex items-center justify-center gap-2 border border-dashed">
                        <Lock className="h-3 w-3" /> Bloqueado
                    </div>
                ) : (
                    <Select value={currentStatus} onValueChange={(v) => handleStatusChange(item, v)}>
                        <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Planeado">Planeado</SelectItem>
                            <SelectItem value="En Progreso">En Progreso</SelectItem>
                            <SelectItem value="Revisión">En Revisión</SelectItem>
                            <SelectItem value="Publicado">Publicado</SelectItem>
                        </SelectContent>
                    </Select>
                )}
            </CardContent>
        </Card>
      );
  };

  return (
    <UserLayout>
      <div className="flex-1 space-y-6 md:space-y-8 p-4 md:p-8 pt-4 md:pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mi Dashboard</h1>
        </div>

        {/* RANKING TOGGLE */}
        <div className="w-full mb-6">
            <Button 
                onClick={() => setShowAchievements(!showAchievements)}
                className={cn(
                    "w-full md:w-auto flex items-center justify-center gap-2 transition-all duration-500 font-bold relative overflow-hidden shadow-lg text-white",
                    !showAchievements 
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 animate-pulse ring-2 ring-offset-2 ring-violet-300 dark:ring-violet-900"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                )}
                size="lg"
            >
                {showAchievements ? <ChevronUp className="h-5 w-5" /> : <Trophy className="h-5 w-5 animate-bounce" />}
                {showAchievements ? "Ocultar Ranking" : "🏆 Ver mi Posición (Ranking)"}
            </Button>

            {showAchievements && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 animate-in slide-in-from-top-4 fade-in-0 duration-500">
                    <Card className={cn("border-2 relative overflow-hidden transition-all hover:scale-[1.01]", getRankCardStyle(achievements.monthlyRank))}>
                        <div className="absolute -right-6 -top-6 opacity-25 rotate-12">
                            {achievements.monthlyRank === 1 ? <Crown className="h-32 w-32" /> : <Award className="h-32 w-32" />}
                        </div>
                        <CardHeader className="pb-2 relative z-10">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                    <Award className="h-5 w-5" /> Ranking Mensual
                                </CardTitle>
                                {achievements.monthlyRank && <Badge className="bg-black/80 text-white border-0">#{achievements.monthlyRank}</Badge>}
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-5xl font-black tracking-tighter">{achievements.myMonthlyScore.toFixed(1)}</span>
                                <span className="text-lg font-medium opacity-70 mb-1">/ 5.0</span>
                            </div>
                            <p className="text-sm font-semibold leading-tight opacity-90">{achievements.monthlyMsg}</p>
                            <div className="mt-4 h-2.5 w-full bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-current transition-all duration-1000" style={{ width: `${(achievements.myMonthlyScore / 5) * 100}%` }} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={cn("border-2 relative overflow-hidden transition-all hover:scale-[1.01]", getRankCardStyle(achievements.weeklyRank))}>
                        <div className="absolute -right-6 -top-6 opacity-25 rotate-12">
                            {achievements.weeklyRank === 1 ? <Trophy className="h-32 w-32" /> : <Medal className="h-32 w-32" />}
                        </div>
                        <CardHeader className="pb-2 relative z-10">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-sm font-bold uppercase flex items-center gap-2">
                                    <Star className="h-5 w-5" /> Ranking Semanal
                                </CardTitle>
                                <div className="flex flex-col items-end">
                                    {achievements.weeklyRank && <Badge className="bg-black/80 text-white border-0 mb-1">#{achievements.weeklyRank}</Badge>}
                                    <span className="text-[10px] font-mono opacity-70 flex items-center gap-1 font-bold">
                                        <Timer className="h-3 w-3" /> Cierra Lun 8:00 AM
                                    </span>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="flex items-end gap-2 mb-2">
                                <span className="text-5xl font-black tracking-tighter">{achievements.myWeeklyScore.toFixed(1)}</span>
                                <span className="text-lg font-medium opacity-70 mb-1">/ 5.0</span>
                            </div>
                            <p className="text-sm font-semibold leading-tight opacity-90">{achievements.weeklyMsg}</p>
                            <div className="mt-4 h-2.5 w-full bg-black/10 rounded-full overflow-hidden">
                                <div className="h-full bg-current transition-all duration-1000" style={{ width: `${(achievements.myWeeklyScore / 5) * 100}%` }} />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <Card className="bg-background shadow-sm border-l-4 border-l-red-500"><CardHeader className="pb-2 p-4"><CardTitle className="text-xs uppercase text-muted-foreground">Pendientes</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-red-600">{stats.pendingTasks}</div></CardContent></Card>
            <Card className="bg-background shadow-sm border-l-4 border-l-yellow-500"><CardHeader className="pb-2 p-4"><CardTitle className="text-xs uppercase text-muted-foreground">En Curso</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-yellow-600">{stats.inProgressTasks}</div></CardContent></Card>
            <Card className="bg-background shadow-sm border-l-4 border-l-green-500"><CardHeader className="pb-2 p-4"><CardTitle className="text-xs uppercase text-muted-foreground">Completadas</CardTitle></CardHeader><CardContent className="p-4 pt-0"><div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div></CardContent></Card>
        </div>

        {/* TABS */}
        <Tabs defaultValue="list" className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    Mis Tareas 
                    <Badge variant="secondary" className="text-xs font-normal">Semana Actual</Badge>
                </h2>
                <TabsList className="w-full sm:w-auto grid grid-cols-4 sm:flex">
                    <TabsTrigger value="list" className="flex gap-2"><ListFilter className="h-4 w-4" /><span className="hidden sm:inline">Lista</span></TabsTrigger>
                    <TabsTrigger value="calendar" className="flex gap-2"><CalendarDays className="h-4 w-4" /><span className="hidden sm:inline">Calendario</span></TabsTrigger>
                    <TabsTrigger value="history" className="flex gap-2"><History className="h-4 w-4" /><span className="hidden sm:inline">Historial</span></TabsTrigger>
                    <TabsTrigger value="halloffame" className="flex gap-2"><TrendingUp className="h-4 w-4" /><span className="hidden sm:inline">Salón de la Fama</span></TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="list">
                <Card>
                    <CardContent className="p-0">
                        <div className="border rounded-lg overflow-x-auto hidden md:block">
                            <Table>
                                <TableHeader><TableRow><TableHead>Contenido</TableHead><TableHead>Fecha</TableHead><TableHead>Estado</TableHead><TableHead>Acción</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={4} className="text-center py-8">Cargando...</TableCell></TableRow> : 
                                     currentTasks.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Aún no tienes tareas asignadas para esta semana.</TableCell></TableRow> : 
                                     currentTasks.map(item => {
                                        const { isLocked, reason } = getTaskLockStatus(item.publishDate);
                                        const myStatus = getMyStatus(item);
                                        return (
                                            <TableRow key={item.id} id={`task-${item.id}`} className={cn(isLocked && "bg-muted/30")}>
                                                <TableCell className="font-medium">
                                                    <div><span className="font-bold block">{item.type}</span><span className="text-xs text-muted-foreground">{item.contentIdea}</span></div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        <span>{item.publishDate || "N/A"}</span>
                                                        {item.recurrenceDays && item.recurrenceDays.length > 0 && <span className="text-xs text-muted-foreground block">{item.recurrenceDays.join(", ")}</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell><Badge variant={getStatusVariant(myStatus)}>{myStatus}</Badge></TableCell>
                                                <TableCell>
                                                    {isLocked ? (
                                                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                                                            <Lock className="h-3 w-3" /> Cerrado
                                                            <TooltipProvider><Tooltip><TooltipTrigger><Info className="h-3 w-3" /></TooltipTrigger><TooltipContent>{reason}</TooltipContent></Tooltip></TooltipProvider>
                                                        </div>
                                                    ) : (
                                                        <Select value={myStatus} onValueChange={(v) => handleStatusChange(item, v)}>
                                                            <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
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
                                        )
                                     })}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="space-y-4 md:hidden p-4">
                            {loading ? <p className="text-center">Cargando...</p> : 
                             currentTasks.length === 0 ? <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">Aún no tienes tareas asignadas para esta semana.</div> :
                             currentTasks.map(item => <TaskCard key={item.id} item={item} />)}
                        </div>
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="calendar" className="mt-0">
                <div className="flex flex-col md:flex-row gap-6">
                    <Card className="flex-shrink-0 md:w-auto"><CardContent className="p-4 flex justify-center"><Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border shadow-sm" modifiers={{ booked: (date) => daysWithTasks(date) }} modifiersClassNames={{ booked: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-red-500 after:rounded-full font-bold text-primary" }} /></CardContent></Card>
                    <Card className="flex-1 border-dashed bg-muted/20">
                        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> {date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : "Selecciona fecha"}</CardTitle><CardDescription>Tareas del día.</CardDescription></CardHeader>
                        <CardContent>
                            {tasksForSelectedDate.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-muted-foreground"><CheckCircle2 className="h-8 w-8 mb-2 opacity-20" /><p>Nada programado.</p></div> : 
                             <div className="space-y-4">{tasksForSelectedDate.map(task => <TaskCard key={task.id} item={task} />)}</div>}
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <TabsContent value="history">
                <Card>
                    <CardHeader><CardTitle>Historial de Tareas</CardTitle><CardDescription>Tareas de semanas anteriores.</CardDescription></CardHeader>
                    <CardContent className="p-0">
                        <div className="border rounded-lg overflow-x-auto hidden md:block">
                            <Table>
                                <TableHeader><TableRow><TableHead>Contenido</TableHead><TableHead>Fecha</TableHead><TableHead>Estado Final</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {historyTasks.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center py-8">Historial vacío.</TableCell></TableRow> : 
                                     historyTasks.map(item => (
                                        <TableRow key={item.id} className="opacity-70 bg-muted/30">
                                            <TableCell className="font-medium">{item.type}<div className="text-xs text-muted-foreground">{item.contentIdea}</div></TableCell>
                                            <TableCell>{item.publishDate}</TableCell>
                                            <TableCell><Badge variant="outline">{getMyStatus(item)}</Badge></TableCell>
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

            <TabsContent value="halloffame">
                <Card>
                    <CardHeader>
                        <CardTitle>Salón de la Fama (Historial Mensual)</CardTitle>
                        <CardDescription>Los mejores desempeños de meses anteriores.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {rankingHistory.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Trophy className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                <p>Aún no se ha generado ningún cierre mensual.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {rankingHistory.map((record: any) => (
                                    <Card key={record.id} className={cn("overflow-hidden border-2 relative transition-all hover:shadow-lg", record.topUsers.some((u: any) => u.userId === user?.uid) ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" : "border-muted/40")}>
                                        {record.topUsers.some((u: any) => u.userId === user?.uid) && (
                                            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-bl font-bold">
                                                ¡Estás aquí!
                                            </div>
                                        )}
                                        <div className="p-3 border-b border-primary/10 flex justify-between items-center bg-muted/20">
                                            <span className="font-bold capitalize text-sm">{record.title}</span>
                                            <Badge variant="outline" className="text-[10px] bg-background">{record.dateProcessed?.toDate ? new Date(record.dateProcessed.toDate()).toLocaleDateString() : 'N/A'}</Badge>
                                        </div>
                                        <div className="p-4 space-y-4">
                                            {record.topUsers.map((u: any, i: number) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-sm",
                                                        u.rank === 1 ? "bg-gradient-to-br from-yellow-200 to-yellow-500 text-yellow-900 border border-yellow-400" :
                                                        u.rank === 2 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 border border-slate-400" :
                                                        "bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900 border border-orange-400"
                                                    )}>
                                                        #{u.rank}
                                                    </div>
                                                    <div className="flex-1 overflow-hidden">
                                                        <p className={cn("text-sm font-medium truncate", u.userId === user?.uid && "text-primary font-bold")}>
                                                            {u.email} {u.userId === user?.uid && "(Tú)"}
                                                        </p>
                                                        <div className="w-full bg-secondary/50 h-1.5 rounded-full mt-1">
                                                            <div className="bg-primary h-full rounded-full" style={{ width: `${(u.score / 5) * 100}%` }}></div>
                                                        </div>
                                                    </div>
                                                    <span className="text-xs font-bold font-mono">{u.score.toFixed(1)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </UserLayout>
  );
};

export default MyContent;
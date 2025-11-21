// src/components/UserLayout.tsx
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; 
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  BarChart2,
  CalendarCheck,
  Image,
  Target,
  LogOut,
  ChevronDown,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CheckCheck,
  LayoutDashboard // <--- Nuevo icono importado
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { auth, db } from "@/firebaseConfig";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, arrayUnion, writeBatch } from "firebase/firestore";
import { differenceInDays, parseISO } from "date-fns"; 
import logo from "@/assets/multimedia-logo.png";
import { ThemeToggle } from "./ThemeToggle";
import { HamburgerMenu } from "./HamburgerMenu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Interfaz auxiliar para las notificaciones
interface NotificationTask {
  id: string;
  type: string;
  publishDate: string;
  status: string;
  contentIdea: string;
  readBy?: string[];
}

export const UserLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  // Estados para notificaciones
  const [notifications, setNotifications] = React.useState<{
    expiring: NotificationTask[];
    pending: NotificationTask[];
    totalCount: number;
    unreadCount: number;
    allIds: string[];
  }>({ expiring: [], pending: [], totalCount: 0, unreadCount: 0, allIds: [] });

  // Escuchar tareas para notificaciones
  React.useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "contentSchedule"),
      where("responsibleIds", "array-contains", user.uid),
      where("isActive", "==", true),
      orderBy("publishDate", "asc") 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const expiring: NotificationTask[] = [];
      const pending: NotificationTask[] = [];
      const allIds: string[] = [];
      let unread = 0;
      const today = new Date();

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data() as NotificationTask;
        const task = { ...data, id: docSnapshot.id };

        if (task.status === "Publicado") return;

        const isRead = task.readBy?.includes(user.uid) || false;
        if (!isRead) {
            unread++;
            allIds.push(task.id);
        }

        let isExpiringSoon = false;
        if (task.publishDate) {
          const dateObj = parseISO(task.publishDate);
          const daysDiff = differenceInDays(dateObj, today);
          if (daysDiff <= 3) {
            isExpiringSoon = true;
          }
        }

        if (isExpiringSoon) {
          expiring.push(task);
        } else if (task.status === "Planeado" || task.status === "Revisión") {
          pending.push(task);
        }
      });

      setNotifications({
        expiring,
        pending,
        totalCount: expiring.length + pending.length,
        unreadCount: unread,
        allIds
      });
    });

    return () => unsubscribe();
  }, [user]);

  // --- FUNCIONES DE MARCAR COMO LEÍDO ---
  const handleMarkAsRead = async (taskId: string) => {
    if (!user) return;
    try {
        const taskRef = doc(db, "contentSchedule", taskId);
        await updateDoc(taskRef, {
            readBy: arrayUnion(user.uid)
        });
    } catch (error) {
        console.error("Error al marcar como leído:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || notifications.allIds.length === 0) return;
    
    try {
        const batch = writeBatch(db);
        notifications.allIds.forEach(id => {
            const ref = doc(db, "contentSchedule", id);
            batch.update(ref, { readBy: arrayUnion(user.uid) });
        });
        await batch.commit();
        toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
        console.error("Error batch update:", error);
        toast.error("Error al actualizar notificaciones");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const getInitials = (email: string) => {
    return email ? email.substring(0, 2).toUpperCase() : "U";
  };

  // Definición del menú con lógica condicional para Admin
  const menuItems = [
    { name: "Mi Contenido", path: "/mi-contenido", icon: CalendarCheck },
    { name: "Equipo", path: "/", icon: Home },
    { name: "Organigrama", path: "/organigrama", icon: Users },
    { name: "Logros y Metas", path: "/logros-metas", icon: BarChart2 },
    { name: "Galería", path: "/galeria", icon: Image },
    { name: "Misión y Visión", path: "/mision-vision", icon: Target },
    // Solo mostramos este ítem si el usuario es admin
    ...(user?.role === 'admin' ? [
      { name: "Panel Admin", path: "/admin-dashboard", icon: LayoutDashboard }
    ] : [])
  ];

  const NotificationsContent = () => (
    <div className="w-80 max-w-[90vw] flex flex-col h-[400px]">
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm">Notificaciones</h4>
            {notifications.unreadCount > 0 && (
                <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold">
                {notifications.unreadCount}
                </span>
            )}
        </div>
        
        {notifications.unreadCount > 0 && (
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                title="Marcar todas como leídas"
                onClick={handleMarkAllAsRead}
            >
                <CheckCheck className="h-4 w-4" />
            </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {notifications.totalCount === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm flex flex-col items-center justify-center h-full mt-10">
            <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
            <p className="font-medium">¡Estás al día!</p>
            <p className="text-xs mt-1 opacity-70">No tienes tareas pendientes.</p>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {/* Sección: Por Vencer */}
            {notifications.expiring.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-destructive uppercase tracking-wider px-2 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Atención Requerida
                </p>
                <div className="space-y-1">
                    {notifications.expiring.map((task) => {
                      const isUnread = !task.readBy?.includes(user?.uid || "");
                      return (
                        <Link 
                            to="/mi-contenido" 
                            key={task.id}
                            onClick={() => handleMarkAsRead(task.id)}
                            className={cn(
                                "group flex flex-col gap-1 p-3 rounded-lg transition-all border border-transparent relative overflow-hidden",
                                "hover:border-destructive/20 hover:shadow-sm",
                                isUnread ? "bg-destructive/5" : "hover:bg-muted/50"
                            )}
                        >
                            {isUnread && (
                                <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-destructive ring-4 ring-destructive/10" />
                            )}
                            
                            <div className="flex justify-between items-start gap-3 pr-4">
                                <span className="text-sm font-semibold text-foreground break-words leading-tight min-w-0">
                                    {task.type}
                                </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground break-words line-clamp-2 w-full">
                                {task.contentIdea}
                            </p>
                            
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-destructive/30 text-destructive bg-destructive/5">
                                    {task.publishDate}
                                </Badge>
                            </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Sección: Pendientes */}
            {notifications.pending.length > 0 && (
              <div>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Pendientes
                </p>
                <div className="space-y-1">
                    {notifications.pending.map((task) => {
                      const isUnread = !task.readBy?.includes(user?.uid || "");
                      return (
                        <Link 
                            to="/mi-contenido" 
                            key={task.id}
                            onClick={() => handleMarkAsRead(task.id)}
                            className={cn(
                                "group flex flex-col gap-1 p-3 rounded-lg transition-all border border-transparent relative overflow-hidden",
                                "hover:border-border hover:shadow-sm",
                                isUnread ? "bg-primary/5" : "hover:bg-muted/50"
                            )}
                        >
                            {isUnread && (
                                <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary ring-4 ring-primary/10" />
                            )}

                            <div className="flex justify-between items-start gap-3 pr-4">
                                <span className="text-sm font-medium text-foreground break-words leading-tight min-w-0">
                                    {task.type}
                                </span>
                            </div>

                            <p className="text-xs text-muted-foreground break-words line-clamp-2 w-full">
                                {task.contentIdea}
                            </p>

                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                                    {task.status}
                                </Badge>
                            </div>
                        </Link>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  return (
    <SidebarProvider defaultOpen={true} open={isMobile ? open : undefined} onOpenChange={isMobile ? setOpen : undefined}>
      
      {/* HEADER MÓVIL */}
      {isMobile && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-background border-b border-border/70 z-40 flex items-center justify-between px-4 md:hidden">
          <HamburgerMenu isOpen={open} onClick={() => setOpen(!open)} />

          <div className="flex items-center gap-3">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notifications.unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="p-0 w-80 shadow-xl border-border/50">
                <NotificationsContent />
              </PopoverContent>
            </Popover>

            <Link to="/mi-contenido">
              <img src={logo} alt="Logo" className="h-8 w-8" />
            </Link>
          </div>
        </header>
      )}

      <Sidebar
        variant="sidebar"
        collapsible="icon"
        className={cn(
          "border-r border-border/70",
          isMobile && "top-16" 
        )}
      >
        <SidebarHeader className="h-20 flex flex-row items-center justify-start px-4 gap-3 border-b border-border/70 pt-6 pb-4">
          <img src={logo} alt="Logo" className="h-12 w-12 shrink-0" />
          <h2 className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent group-data-[collapsible=icon]:hidden">
            Multimedia
          </h2>
        </SidebarHeader>

        <SidebarContent className="py-4 flex-1">
          <SidebarMenu className="px-2">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.name}
                >
                  <Link to={item.path}>
                    <item.icon />
                    <span className="text-base">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-2 border-t border-border/70">
          <div className="flex items-center justify-between px-2 mb-2 gap-1">
            <ThemeToggle />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-4 w-4" />
                  {notifications.unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="p-0 ml-2 shadow-xl border-border/50">
                <NotificationsContent />
              </PopoverContent>
            </Popover>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex w-full items-center justify-between px-2"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email ? getInitials(user.email) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium group-data-[collapsible=icon]:hidden">
                    {user?.email}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 mb-2" align="end">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar Sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className={isMobile ? "pt-16" : ""}>{children}</SidebarInset>
    </SidebarProvider>
  );
};
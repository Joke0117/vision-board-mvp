import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, LayoutDashboard, Users } from "lucide-react";
import { TaskTable } from "@/components/admin/TaskTable";
import { TaskDialog } from "@/components/admin/TaskDialog";
import { type Task, type Profile } from "@/types/admin";

const AdminPanel = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    await fetchUserProfile(session.user.id);
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      if (!data) return;
      setProfile(data as Profile);
      
      if (data.role === "admin") {
        await fetchAllProfiles();
        await fetchAllTasks();
      } else {
        await fetchMyTasks(userId);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProfiles = async () => {
    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("*")
      .order("full_name");

    if (error) {
      console.error("Error fetching profiles:", error);
      return;
    }
    setProfiles((data || []) as Profile[]);
  };

  const fetchAllTasks = async () => {
    const { data, error } = await (supabase as any)
      .from("tasks")
      .select(`
        *,
        responsable:profiles!tasks_responsable_id_fkey(id, email, full_name),
        creator:profiles!tasks_created_by_fkey(id, email, full_name)
      `)
      .order("fecha_publicacion", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }
    setTasks((data || []) as Task[]);
  };

  const fetchMyTasks = async (userId: string) => {
    const { data, error } = await (supabase as any)
      .from("tasks")
      .select(`
        *,
        responsable:profiles!tasks_responsable_id_fkey(id, email, full_name),
        creator:profiles!tasks_created_by_fkey(id, email, full_name)
      `)
      .eq("responsable_id", userId)
      .order("fecha_publicacion", { ascending: false });

    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }
    setTasks((data || []) as Task[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setIsDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Tarea eliminada",
        description: "La tarea ha sido eliminada correctamente",
      });

      if (profile?.role === "admin") {
        await fetchAllTasks();
      } else if (user) {
        await fetchMyTasks(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveTask = async () => {
    if (profile?.role === "admin") {
      await fetchAllTasks();
    } else if (user) {
      await fetchMyTasks(user.id);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando panel...</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Panel de Gestión</h1>
                <p className="text-sm text-muted-foreground">
                  {isAdmin ? "Administrador" : "Miembro del Equipo"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/")} variant="ghost" className="gap-2">
                <Users className="w-4 h-4" />
                Equipo
              </Button>
              <Button onClick={handleLogout} variant="outline" className="gap-2">
                <LogOut className="w-4 h-4" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                {isAdmin ? "Parrilla de Contenido" : "Mis Tareas Asignadas"}
              </h2>
              <p className="text-muted-foreground">
                {isAdmin 
                  ? "Gestiona todas las tareas del equipo de multimedia"
                  : "Consulta y actualiza el estado de tus tareas"}
              </p>
            </div>
            {isAdmin && (
              <Button onClick={handleCreateTask} className="gap-2 shadow-lg" size="lg">
                <Plus className="w-5 h-5" />
                Nueva Tarea
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl p-6 border shadow-sm">
              <div className="text-3xl font-bold text-primary mb-1">{tasks.length}</div>
              <div className="text-sm text-muted-foreground">Total de Tareas</div>
            </div>
            <div className="bg-card rounded-xl p-6 border shadow-sm">
              <div className="text-3xl font-bold text-secondary mb-1">
                {tasks.filter(t => t.estado === "pendiente").length}
              </div>
              <div className="text-sm text-muted-foreground">Pendientes</div>
            </div>
            <div className="bg-card rounded-xl p-6 border shadow-sm">
              <div className="text-3xl font-bold text-accent mb-1">
                {tasks.filter(t => t.estado === "en_progreso").length}
              </div>
              <div className="text-sm text-muted-foreground">En Progreso</div>
            </div>
            <div className="bg-card rounded-xl p-6 border shadow-sm">
              <div className="text-3xl font-bold text-green-600 mb-1">
                {tasks.filter(t => t.estado === "completado").length}
              </div>
              <div className="text-sm text-muted-foreground">Completadas</div>
            </div>
          </div>

          {/* Task Table */}
          <TaskTable
            tasks={tasks}
            isAdmin={isAdmin}
            onEdit={handleEditTask}
            onDelete={handleDeleteTask}
          />
        </div>
      </main>

      {/* Task Dialog */}
      {isAdmin && (
        <TaskDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          task={editingTask}
          profiles={profiles}
          onSave={handleSaveTask}
          currentUserId={user?.id}
        />
      )}
    </div>
  );
};

export default AdminPanel;

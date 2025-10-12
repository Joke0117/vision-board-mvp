import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, ClipboardList } from "lucide-react";
import { TaskTable } from "@/components/admin/TaskTable";
import { type Task, type Profile } from "@/types/admin";

const MyTasks = () => {
  const [user, setUser] = useState<any>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchMyTasks(session.user.id);
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
    await fetchMyTasks(session.user.id);
  };

  const fetchMyTasks = async (userId: string) => {
    try {
      const { data, error } = await (supabase as any)
        .from("tasks")
        .select(`
          *,
          responsable:profiles!tasks_responsable_id_fkey(id, email, full_name),
          creator:profiles!tasks_created_by_fkey(id, email, full_name)
        `)
        .eq("responsable_id", userId)
        .order("fecha_publicacion", { ascending: false });

      if (error) throw error;
      setTasks((data || []) as Task[]);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .update({ estado: newStatus })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Estado actualizado",
        description: "El estado de la tarea ha sido actualizado correctamente",
      });

      if (user) {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tus tareas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <ClipboardList className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mis Tareas Asignadas</h1>
                <p className="text-sm text-muted-foreground">Miembro del Equipo</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate("/")} variant="ghost">
                Inicio
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
          <div className="mb-6">
            <h2 className="text-3xl font-bold mb-2">Tus Tareas</h2>
            <p className="text-muted-foreground">
              Consulta y actualiza el estado de las tareas que te han sido asignadas
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            isAdmin={false}
            onEdit={() => {}}
            onDelete={() => {}}
            onUpdateStatus={handleUpdateTaskStatus}
          />
        </div>
      </main>
    </div>
  );
};

export default MyTasks;

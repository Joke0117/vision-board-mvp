import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Plus, Edit, Trash2, LogOut } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

interface Task {
  id: string;
  tipo_publicidad: string;
  plataforma: string;
  fecha_publicacion: string;
  formato: string;
  objetivo: string;
  publico_objetivo: string;
  idea_contenido: string;
  responsable_id: string;
  estado: string;
  profiles: Profile;
}

const ESTADO_COLORS: Record<string, string> = {
  pendiente: "bg-yellow-500",
  en_progreso: "bg-blue-500",
  completado: "bg-green-500",
  cancelado: "bg-red-500"
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso", 
  completado: "Completado",
  cancelado: "Cancelado"
};

export default function AdminPanel() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    tipo_publicidad: "",
    plataforma: "",
    fecha_publicacion: "",
    formato: "",
    objetivo: "",
    publico_objetivo: "",
    idea_contenido: "",
    responsable_id: "",
    estado: "pendiente"
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchProfiles();
      fetchTasks();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      console.error("Error fetching profiles:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          *,
          profiles!tasks_responsable_id_fkey (
            id,
            email,
            full_name,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      console.error("Error fetching tasks:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      const taskData = {
        ...formData,
        created_by: user.id
      };

      if (editingTask) {
        const { error } = await supabase
          .from("tasks")
          .update(taskData)
          .eq("id", editingTask.id);

        if (error) throw error;
        
        toast({
          title: "Tarea actualizada",
          description: "La tarea ha sido actualizada correctamente.",
        });
      } else {
        const { error } = await supabase
          .from("tasks")
          .insert(taskData);

        if (error) throw error;
        
        toast({
          title: "Tarea creada",
          description: "La nueva tarea ha sido asignada correctamente.",
        });
      }

      // Reset form
      setFormData({
        tipo_publicidad: "",
        plataforma: "",
        fecha_publicacion: "",
        formato: "",
        objetivo: "",
        publico_objetivo: "",
        idea_contenido: "",
        responsable_id: "",
        estado: "pendiente"
      });
      setEditingTask(null);
      setIsDialogOpen(false);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: Task) => {
    setFormData({
      tipo_publicidad: task.tipo_publicidad,
      plataforma: task.plataforma,
      fecha_publicacion: task.fecha_publicacion,
      formato: task.formato,
      objetivo: task.objetivo,
      publico_objetivo: task.publico_objetivo,
      idea_contenido: task.idea_contenido,
      responsable_id: task.responsable_id,
      estado: task.estado
    });
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return;

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;
      
      toast({
        title: "Tarea eliminada",
        description: "La tarea ha sido eliminada correctamente.",
      });
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const canManageTasks = profile?.role === "admin";
  const userTasks = canManageTasks ? tasks : tasks.filter(task => task.responsable_id === user?.id);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando panel administrativo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Panel Administrativo</h1>
            <p className="text-muted-foreground">
              Bienvenido, {profile?.full_name} ({profile?.role === "admin" ? "Administrador" : "Miembro"})
            </p>
          </div>
          <Button onClick={handleSignOut} variant="outline" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Task Form - Only for admins */}
          {canManageTasks && (
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Nueva Tarea
                  </CardTitle>
                  <CardDescription>
                    Crear y asignar tareas al equipo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Tarea
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>
                          {editingTask ? "Editar Tarea" : "Nueva Tarea"}
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="tipo">Tipo Publicidad</Label>
                            <Input
                              id="tipo"
                              value={formData.tipo_publicidad}
                              onChange={(e) => setFormData({...formData, tipo_publicidad: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="plataforma">Plataforma</Label>
                            <Select
                              value={formData.plataforma}
                              onValueChange={(value) => setFormData({...formData, plataforma: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar plataforma" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="facebook">Facebook</SelectItem>
                                <SelectItem value="instagram">Instagram</SelectItem>
                                <SelectItem value="tiktok">TikTok</SelectItem>
                                <SelectItem value="youtube">YouTube</SelectItem>
                                <SelectItem value="web">Página Web</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="fecha">Fecha Publicación</Label>
                            <Input
                              id="fecha"
                              type="date"
                              value={formData.fecha_publicacion}
                              onChange={(e) => setFormData({...formData, fecha_publicacion: e.target.value})}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="formato">Formato</Label>
                            <Select
                              value={formData.formato}
                              onValueChange={(value) => setFormData({...formData, formato: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar formato" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="imagen">Imagen</SelectItem>
                                <SelectItem value="video">Video</SelectItem>
                                <SelectItem value="carrusel">Carrusel</SelectItem>
                                <SelectItem value="historia">Historia</SelectItem>
                                <SelectItem value="reel">Reel</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="objetivo">Objetivo</Label>
                          <Input
                            id="objetivo"
                            value={formData.objetivo}
                            onChange={(e) => setFormData({...formData, objetivo: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="publico">Público Objetivo</Label>
                          <Input
                            id="publico"
                            value={formData.publico_objetivo}
                            onChange={(e) => setFormData({...formData, publico_objetivo: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="idea">Idea del Contenido</Label>
                          <Textarea
                            id="idea"
                            value={formData.idea_contenido}
                            onChange={(e) => setFormData({...formData, idea_contenido: e.target.value})}
                            required
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="responsable">Responsable</Label>
                            <Select
                              value={formData.responsable_id}
                              onValueChange={(value) => setFormData({...formData, responsable_id: value})}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar responsable" />
                              </SelectTrigger>
                              <SelectContent>
                                {profiles.map((profile) => (
                                  <SelectItem key={profile.id} value={profile.id}>
                                    {profile.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="estado">Estado</Label>
                            <Select
                              value={formData.estado}
                              onValueChange={(value) => setFormData({...formData, estado: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_progreso">En Progreso</SelectItem>
                                <SelectItem value="completado">Completado</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <Button type="submit" className="w-full">
                          {editingTask ? "Actualizar Tarea" : "Crear Tarea"}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tasks Table */}
          <div className={canManageTasks ? "lg:col-span-3" : "lg:col-span-4"}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {canManageTasks ? "Gestión de Tareas del Equipo" : "Mis Tareas Asignadas"}
                </CardTitle>
                <CardDescription>
                  {canManageTasks ? 
                    "Administra todas las tareas del equipo de multimedia" :
                    "Visualiza y actualiza el estado de tus tareas asignadas"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Plataforma</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Formato</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Estado</TableHead>
                        {canManageTasks && <TableHead>Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="font-medium">{task.tipo_publicidad}</TableCell>
                          <TableCell>{task.plataforma}</TableCell>
                          <TableCell>{new Date(task.fecha_publicacion).toLocaleDateString()}</TableCell>
                          <TableCell>{task.formato}</TableCell>
                          <TableCell>{task.profiles?.full_name}</TableCell>
                          <TableCell>
                            <Badge className={ESTADO_COLORS[task.estado]}>
                              {ESTADO_LABELS[task.estado]}
                            </Badge>
                          </TableCell>
                          {canManageTasks && (
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEdit(task)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDelete(task.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {userTasks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      {canManageTasks ? "No hay tareas creadas aún." : "No tienes tareas asignadas."}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
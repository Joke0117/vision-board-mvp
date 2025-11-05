// src/pages/AdminDashboard.tsx
import * as React from "react";
import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { collection, addDoc, getDocs, doc, query, Timestamp, deleteDoc, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { Trash, PlusCircle, Users, BarChart, Clock, CheckCircle } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle"; // Importar ThemeToggle

// Interfaz para el usuario del equipo
interface TeamUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

// Interfaz para el contenido, basada en tus campos
interface Content {
  id: string;
  type: string; // Tipo de Publicidad
  platform: string; // Plataforma
  publishDate: string; // Fecha de Publicación
  format: string; // Formato
  objective: string; // Objetivo
  audience: string; // Público Objetivo
  contentIdea: string; // Idea del Contenido
  responsibleId: string; // Responsable (ID)
  responsibleEmail: string; // Responsable (Email)
  status: "Planeado" | "En Progreso" | "Publicado" | "Revisión";
  createdAt: Timestamp;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [contentSchedule, setContentSchedule] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats en vivo
  const [stats, setStats] = useState({
    planned: 0,
    inProgress: 0,
    published: 0,
    totalUsers: 0,
  });

  // Estados del formulario
  const [formState, setFormState] = useState({
    type: "",
    platform: "",
    publishDate: "",
    format: "",
    objective: "",
    audience: "",
    contentIdea: "",
    responsibleId: "",
  });

  // Cargar equipo y contenido
  useEffect(() => {
    // Cargar TODOS los miembros del equipo (admin + users)
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

    // Suscribirse al contenido para actualizaciones en vivo
    const contentQuery = query(collection(db, "contentSchedule"), orderBy("publishDate", "desc"));
    const unsubscribe = onSnapshot(contentQuery, (snapshot) => {
      const contentData: Content[] = [];
      let planned = 0, inProgress = 0, published = 0;

      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<Content, "id">;
        contentData.push({ id: doc.id, ...data });
        // Actualizar stats en vivo
        if (data.status === "Planeado") planned++;
        if (data.status === "En Progreso") inProgress++;
        if (data.status === "Publicado") published++;
      });
      
      setContentSchedule(contentData); // Ya viene ordenada por el query
      setStats(s => ({ ...s, planned, inProgress, published }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSelectChange = (id: string, value: string) => {
     setFormState(prev => ({ ...prev, [id]: value }));
  };

  const resetForm = () => {
     setFormState({
        type: "",
        platform: "",
        publishDate: "",
        format: "",
        objective: "",
        audience: "",
        contentIdea: "",
        responsibleId: "",
     });
  };

  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.type || !formState.platform || !formState.contentIdea || !formState.responsibleId) {
      alert("Por favor, completa los campos requeridos.");
      return;
    }

    try {
      const selectedUser = team.find(u => u.id === formState.responsibleId);
      if (!selectedUser) return;

      await addDoc(collection(db, "contentSchedule"), {
        ...formState,
        responsibleEmail: selectedUser.email,
        status: "Planeado",
        createdAt: Timestamp.now(),
        createdBy: user?.uid,
      });

      resetForm(); // Limpiar formulario
    } catch (error) {
      console.error("Error al crear contenido: ", error);
    }
  };
  
  const handleDeleteContent = async (contentId: string) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta publicación?")) {
      try { 
        await deleteDoc(doc(db, "contentSchedule", contentId));
      } catch (error) { 
        console.error("Error al eliminar contenido: ", error);
      }
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
      {/* ==================================
        CAMBIO 1: Padding responsivo aquí 
        Original: className="flex-1 space-y-8 p-8 pt-6"
        ==================================
      */}
      <div className="flex-1 space-y-8 px-4 py-6 md:px-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Dashboard de Contenido
        </h1>

        {/* Stats (Estas cards ya son responsivas) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-destructive dark:border-destructive">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Contenido Planeado</CardTitle>
              <Clock className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.planned}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-yellow-500 dark:border-yellow-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <BarChart className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.inProgress}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-primary dark:border-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Publicados</CardTitle>
              <CheckCircle className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.published}</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-muted-foreground dark:border-muted-foreground">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Miembros</CardTitle>
              <Users className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Formulario desplegable y Tabla */}
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
                {/* Este formulario ya es responsivo */}
                <form onSubmit={handleSubmitContent} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo de Publicidad</Label>
                    <Input id="type" value={formState.type} onChange={handleFormChange} placeholder="Ej. Prédica dominical, Anuncio" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform">Plataforma</Label>
                    <Select value={formState.platform} onValueChange={(v) => handleSelectChange("platform", v)} required>
                      <SelectTrigger id="platform"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                        <SelectItem value="YouTube">YouTube</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publishDate">Fecha de Publicación</Label>
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
                    <Label htmlFor="responsibleId">Responsable</Label>
                    <Select value={formState.responsibleId} onValueChange={(v) => handleSelectChange("responsibleId", v)} required>
                      <SelectTrigger id="responsibleId"><SelectValue placeholder="Seleccionar miembro" /></SelectTrigger>
                      <SelectContent>
                        {team.map(member => (
                          <SelectItem key={member.id} value={member.id}>{member.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="md:col-span-2 w-full">Crear Publicación</Button>
                </form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Tabla de Contenido */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Contenido</CardTitle>
            </CardHeader>
            <CardContent>
              {/* ==================================
                CAMBIO 2: Tabla solo para Desktop (md:block)
                ==================================
              */}
              <div className="border rounded-lg overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contenido</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Publicar</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">Cargando contenido...</TableCell>
                      </TableRow>
                    ) : contentSchedule.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">No hay contenido planeado.</TableCell>
                      </TableRow>
                    ) : (
                      contentSchedule.map(item => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.type}</TableCell>
                          <TableCell>{item.responsibleEmail}</TableCell>
                          <TableCell>{item.platform}</TableCell>
                          <TableCell>{item.publishDate || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteContent(item.id)}>
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* ==================================
                CAMBIO 3: Cards solo para Móvil (md:hidden)
                ==================================
              */}
              <div className="space-y-4 md:hidden">
                {loading ? (
                  <p className="text-center">Cargando contenido...</p>
                ) : contentSchedule.length === 0 ? (
                  <p className="text-center">No hay contenido planeado.</p>
                ) : (
                  contentSchedule.map(item => (
                    <Card key={item.id} className="w-full">
                      <CardHeader>
                        <CardTitle className="text-lg">{item.type}</CardTitle>
                        <CardDescription>{item.responsibleEmail}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Plataforma:</span>
                          <span className="font-semibold">{item.platform}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm font-medium text-muted-foreground">Publicar:</span>
                          <span className="font-semibold">{item.publishDate || "N/A"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-muted-foreground">Estado:</span>
                          <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                        </div>
                        <div className="flex justify-end pt-2">
                           <Button variant="ghost" size="icon" onClick={() => handleDeleteContent(item.id)}>
                             <Trash className="h-4 w-4 text-destructive" />
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
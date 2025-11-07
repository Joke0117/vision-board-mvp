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
import { PlusCircle, Users, BarChart, Clock, CheckCircle, ChevronsUpDown, Check, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// Interfaz para el usuario del equipo
interface TeamUser {
  id: string;
  email: string;
  role: "admin" | "user";
}

// Interfaz para el contenido
interface Content {
  id: string;
  type: string;
  platform: string;
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

const AdminDashboard = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamUser[]>([]);
  const [contentSchedule, setContentSchedule] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  // Popovers de multiselect
  const [openCreateMultiSelect, setOpenCreateMultiSelect] = useState(false);
  const [openEditMultiSelect, setOpenEditMultiSelect] = useState(false);
  
  // Estado para el modal de Edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Content | null>(null);

  const [stats, setStats] = useState({
    planned: 0,
    inProgress: 0,
    published: 0,
    totalUsers: 0,
  });

  // Estado del formulario de CREAR
  const initialFormState = {
    type: "",
    platform: "",
    publishDate: "",
    format: "",
    objective: "",
    audience: "",
    contentIdea: "",
    responsibleIds: [] as string[],
  };
  const [formState, setFormState] = useState(initialFormState);
  
  // Estado del formulario de EDITAR
  const [editFormState, setEditFormState] = useState<Omit<Content, "id" | "responsibleEmails" | "status" | "isActive" | "createdAt">>({
     type: "",
     platform: "",
     publishDate: "",
     format: "",
     objective: "",
     audience: "",
     contentIdea: "",
     responsibleIds: [] as string[],
  });


  // Cargar equipo y contenido
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
        const data = doc.data() as Omit<Content, "id" | "createdAt"> & { createdAt: Timestamp };
        contentData.push({ id: doc.id, ...data });
        
        if (data.isActive) {
          if (data.status === "Planeado") planned++;
          if (data.status === "En Progreso") inProgress++;
          if (data.status === "Publicado") published++;
        }
      });
      
      setContentSchedule(contentData);
      setStats(s => ({ ...s, planned, inProgress, published }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Funciones para el formulario de CREAR ---
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };
  const handleSelectChange = (id: string, value: string) => {
     setFormState(prev => ({ ...prev, [id]: value }));
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
  
  // --- Funciones para el formulario de EDITAR ---
  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };
  const handleEditSelectChange = (id: string, value: string) => {
     setEditFormState(prev => ({ ...prev, [id]: value }));
  };
  const handleEditMultiSelectChange = (userId: string) => {
    setEditFormState(prev => {
      const newIds = prev.responsibleIds.includes(userId)
        ? prev.responsibleIds.filter(id => id !== userId)
        : [...prev.responsibleIds, userId];
      return { ...prev, responsibleIds: newIds };
    });
  };

  // --- Lógica de Submit ---
  const handleSubmitContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.type || !formState.platform || !formState.contentIdea || formState.responsibleIds.length === 0) {
      alert("Por favor, completa los campos requeridos (incluyendo al menos 1 responsable).");
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

      resetForm();
    } catch (error) {
      console.error("Error al crear contenido: ", error);
    }
  };

  const handleOpenEditModal = (task: Content) => {
    setCurrentTask(task);
    setEditFormState({
      type: task.type,
      platform: task.platform,
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

      setIsEditModalOpen(false);
      setCurrentTask(null);
    } catch (error) {
      console.error("Error al actualizar la tarea: ", error);
    }
  };
  
  const handleToggleActive = async (contentId: string, currentIsActive: boolean) => {
    try {
      const contentDocRef = doc(db, "contentSchedule", contentId);
      await updateDoc(contentDocRef, {
        isActive: !currentIsActive
      });
    } catch (error) {
      console.error("Error al actualizar estado: ", error);
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

        {/* CARDS DE STATS */}
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
                {/* --- Formulario de CREAR --- */}
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
                        <SelectItem value="YouTube">Whatsapp</SelectItem>
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

          {/* Tabla de Contenido */}
          <Card>
            <CardHeader>
              <CardTitle>Historial de Contenido</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Vista de Tabla para Desktop */}
              <div className="border rounded-lg overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contenido</TableHead>
                      <TableHead>Responsable(s)</TableHead>
                      <TableHead>Plataforma</TableHead>
                      <TableHead>Publicar</TableHead>
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
                          <TableCell>{item.platform}</TableCell>
                          <TableCell>{item.publishDate || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                          </TableCell>
                          {/* --- BOTÓN DE EDITAR (DESKTOP) --- */}
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
              
              {/* Vista de Cards para Móvil */}
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
                          {/* --- BOTÓN DE EDITAR (MÓVIL) --- */}
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEditModal(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
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
                      {/* ==================================
                        ¡AQUÍ ESTÁ LA CORRECCIÓN!
                        Original: </Content>
                        ==================================
                      */}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL DE EDICIÓN */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px] md:max-w-[600px]">
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
            <div className="space-y-2">
              <Label htmlFor="edit-platform">Plataforma</Label>
              <Select value={editFormState.platform} onValueChange={(v) => handleEditSelectChange("platform", v)} required>
                <SelectTrigger id="platform"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Facebook">Facebook</SelectItem>
                  <SelectItem value="Instagram">Instagram</SelectItem>
                  <SelectItem value="TikTok">TikTok</SelectItem>
                  <SelectItem value="YouTube">YouTube</SelectItem>
                  <SelectItem value="YouTube">Whatsapp</SelectItem>
                </SelectContent>
              </Select>
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
    </AdminLayout>
  );
};

export default AdminDashboard;
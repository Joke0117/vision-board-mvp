import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { type Task, type Profile } from "@/types/admin";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  profiles: Profile[];
  onSave: () => void;
  currentUserId: string;
}

const plataformas = ["Facebook", "Instagram", "TikTok", "YouTube", "Twitter", "LinkedIn", "WhatsApp"];
const tiposPublicidad = ["Orgánico", "Pagado", "Story", "Reel", "Post", "Video", "Livestream"];
const formatos = ["Imagen", "Video", "Carrusel", "Story", "Reel", "Live"];
const estados = [
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En Progreso" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

export const TaskDialog = ({ open, onOpenChange, task, profiles, onSave, currentUserId }: TaskDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    tipo_publicidad: "",
    plataforma: "",
    fecha_publicacion: "",
    formato: "",
    objetivo: "",
    publico_objetivo: "",
    idea_contenido: "",
    responsable_id: "",
    estado: "pendiente",
  });

  useEffect(() => {
    if (task) {
      setFormData({
        tipo_publicidad: task.tipo_publicidad,
        plataforma: task.plataforma,
        fecha_publicacion: task.fecha_publicacion,
        formato: task.formato,
        objetivo: task.objetivo,
        publico_objetivo: task.publico_objetivo,
        idea_contenido: task.idea_contenido,
        responsable_id: task.responsable_id,
        estado: task.estado,
      });
    } else {
      setFormData({
        tipo_publicidad: "",
        plataforma: "",
        fecha_publicacion: "",
        formato: "",
        objetivo: "",
        publico_objetivo: "",
        idea_contenido: "",
        responsable_id: "",
        estado: "pendiente",
      });
    }
  }, [task, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (task) {
        // Update existing task
        const { error } = await (supabase as any)
          .from("tasks")
          .update(formData)
          .eq("id", task.id);

        if (error) throw error;

        toast({
          title: "Tarea actualizada",
          description: "La tarea ha sido actualizada correctamente",
        });
      } else {
        // Create new task
        const { error } = await (supabase as any)
          .from("tasks")
          .insert({
            ...formData,
            created_by: currentUserId,
          });

        if (error) throw error;

        toast({
          title: "Tarea creada",
          description: "La tarea ha sido creada correctamente",
        });
      }

      onSave();
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {task ? "Editar Tarea" : "Nueva Tarea"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo_publicidad">Tipo de Publicidad *</Label>
              <Select
                value={formData.tipo_publicidad}
                onValueChange={(value) => setFormData({ ...formData, tipo_publicidad: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposPublicidad.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plataforma">Plataforma *</Label>
              <Select
                value={formData.plataforma}
                onValueChange={(value) => setFormData({ ...formData, plataforma: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {plataformas.map((plat) => (
                    <SelectItem key={plat} value={plat}>{plat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_publicacion">Fecha de Publicación *</Label>
              <Input
                id="fecha_publicacion"
                type="date"
                value={formData.fecha_publicacion}
                onChange={(e) => setFormData({ ...formData, fecha_publicacion: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formato">Formato *</Label>
              <Select
                value={formData.formato}
                onValueChange={(value) => setFormData({ ...formData, formato: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un formato" />
                </SelectTrigger>
                <SelectContent>
                  {formatos.map((fmt) => (
                    <SelectItem key={fmt} value={fmt}>{fmt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsable_id">Responsable *</Label>
              <Select
                value={formData.responsable_id}
                onValueChange={(value) => setFormData({ ...formData, responsable_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un responsable" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estado">Estado *</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {estados.map((est) => (
                    <SelectItem key={est.value} value={est.value}>{est.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objetivo">Objetivo *</Label>
            <Textarea
              id="objetivo"
              value={formData.objetivo}
              onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
              placeholder="Describe el objetivo de esta publicación..."
              required
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="publico_objetivo">Público Objetivo *</Label>
            <Input
              id="publico_objetivo"
              value={formData.publico_objetivo}
              onChange={(e) => setFormData({ ...formData, publico_objetivo: e.target.value })}
              placeholder="Ej: Jóvenes 18-35 años"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="idea_contenido">Idea del Contenido *</Label>
            <Textarea
              id="idea_contenido"
              value={formData.idea_contenido}
              onChange={(e) => setFormData({ ...formData, idea_contenido: e.target.value })}
              placeholder="Describe la idea del contenido..."
              required
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : task ? "Actualizar" : "Crear Tarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

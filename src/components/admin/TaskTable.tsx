import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2 } from "lucide-react";
import { type Task } from "@/types/admin";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface TaskTableProps {
  tasks: Task[];
  isAdmin: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdateStatus?: (taskId: string, newStatus: string) => void;
}

const estadoColors = {
  pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  en_progreso: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completado: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const estadoLabels = {
  pendiente: "Pendiente",
  en_progreso: "En Progreso",
  completado: "Completado",
  cancelado: "Cancelado",
};

export const TaskTable = ({ tasks, isAdmin, onEdit, onDelete, onUpdateStatus }: TaskTableProps) => {
  return (
    <div className="bg-card rounded-xl border shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-bold">Tipo Publicidad</TableHead>
              <TableHead className="font-bold">Plataforma</TableHead>
              <TableHead className="font-bold">Fecha Publicación</TableHead>
              <TableHead className="font-bold">Formato</TableHead>
              <TableHead className="font-bold">Objetivo</TableHead>
              <TableHead className="font-bold">Público Objetivo</TableHead>
              <TableHead className="font-bold">Idea del Contenido</TableHead>
              <TableHead className="font-bold">Responsable</TableHead>
              <TableHead className="font-bold">Estado</TableHead>
              {isAdmin && <TableHead className="font-bold text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-12 text-muted-foreground">
                  No hay tareas disponibles
                </TableCell>
              </TableRow>
            ) : (
              tasks.map((task) => (
                <TableRow key={task.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{task.tipo_publicidad}</TableCell>
                  <TableCell>{task.plataforma}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(task.fecha_publicacion), "dd MMM yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>{task.formato}</TableCell>
                  <TableCell className="max-w-xs truncate">{task.objetivo}</TableCell>
                  <TableCell>{task.publico_objetivo}</TableCell>
                  <TableCell className="max-w-xs truncate">{task.idea_contenido}</TableCell>
                  <TableCell>{task.responsable?.full_name || task.responsable?.email}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Badge className={estadoColors[task.estado]}>
                        {estadoLabels[task.estado]}
                      </Badge>
                    ) : (
                      <Select
                        value={task.estado}
                        onValueChange={(value) => onUpdateStatus?.(task.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_progreso">En Progreso</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(task)}
                          className="hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(task.id)}
                          className="hover:bg-destructive/10 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

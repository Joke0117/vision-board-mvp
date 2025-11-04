// src/pages/MyContent.tsx
import * as React from "react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { collection, query, onSnapshot, doc, updateDoc, Timestamp, orderBy } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { useAuth } from "@/hooks/useAuth";
import { CalendarCheck, Star } from "lucide-react";
import { cn } from "@/lib/utils"; // Importar cn

// Interfaz para el contenido
interface Content {
  id: string;
  type: string;
  platform: string;
  publishDate: string;
  contentIdea: string;
  responsibleId: string;
  responsibleEmail: string;
  status: "Planeado" | "En Progreso" | "Publicado" | "Revisión";
  createdAt: Timestamp;
}

const MyContent = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    // CORRECCIÓN: Consultar toda la colección, ordenada por fecha
    const contentQuery = query(collection(db, "contentSchedule"), orderBy("publishDate", "desc"));

    const unsubscribe = onSnapshot(contentQuery, (snapshot) => {
      const contentData: Content[] = [];
      snapshot.forEach((doc) => {
        contentData.push({ id: doc.id, ...(doc.data() as Omit<Content, "id">) });
      });
      setContent(contentData); // Ya viene ordenada
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleStatusChange = async (contentId: string, newStatus: Content['status']) => {
    try {
      const contentDocRef = doc(db, "contentSchedule", contentId);
      await updateDoc(contentDocRef, {
        status: newStatus
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
      default: 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <CalendarCheck className="h-10 w-10 text-primary" />
            <h1 className="text-4xl font-bold">
              Plan de Contenido del Equipo
            </h1>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Próximas Publicaciones</CardTitle>
              <CardDescription>
                Este es el calendario de todo el equipo. Tus tareas asignadas están resaltadas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contenido</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Fecha de Pub.</TableHead>
                      <TableHead>Estado Actual</TableHead>
                      <TableHead className="w-[180px]">Actualizar Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">Cargando contenido...</TableCell>
                      </TableRow>
                    ) : content.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">No hay contenido planeado.</TableCell>
                      </TableRow>
                    ) : (
                      content.map(item => {
                        const isMyTask = item.responsibleId === user?.uid;
                        return (
                          <TableRow 
                            key={item.id} 
                            // CORRECCIÓN: Resaltar la fila si es mi tarea
                            className={cn(isMyTask && "bg-primary/10 hover:bg-primary/20")}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {isMyTask && <Star className="h-4 w-4 text-yellow-500" />}
                                <span>{item.type}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1 ml-6">{item.contentIdea}</p>
                            </TableCell>
                            <TableCell>{item.responsibleEmail}</TableCell>
                            <TableCell>{item.publishDate || "N/A"}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(item.status)}>{item.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select 
                                value={item.status} 
                                onValueChange={(newStatus) => handleStatusChange(item.id, newStatus as Content['status'])}
                                // Solo el responsable puede cambiar el estado
                                disabled={!isMyTask && user?.role !== 'admin'}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Cambiar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Planeado">Planeado</SelectItem>
                                  <SelectItem value="En Progreso">En Progreso</SelectItem>
                                  <SelectItem value="Revisión">En Revisión</SelectItem>
                                  <SelectItem value="Publicado">Publicado</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyContent;
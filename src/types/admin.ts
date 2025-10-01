export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: "admin" | "member";
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  tipo_publicidad: string;
  plataforma: string;
  fecha_publicacion: string;
  formato: string;
  objetivo: string;
  publico_objetivo: string;
  idea_contenido: string;
  responsable_id: string;
  estado: "pendiente" | "en_progreso" | "completado" | "cancelado";
  created_by: string;
  created_at: string;
  updated_at: string;
  responsable?: Profile;
  creator?: Profile;
}

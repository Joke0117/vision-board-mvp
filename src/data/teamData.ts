import { Users, Camera, Palette, Heart } from "lucide-react";
import { TeamData } from "@/components/TeamSection";

export const teamsData: TeamData[] = [
  {
    id: "leadership",
    title: "Liderazgo",
    icon: Users,
    color: "bg-gradient-to-br from-primary to-accent",
    members: [
      { name: "Moisés Rodelo", role: "Co-líder" },
      { name: "José Martínez", role: "Co-líder" },
    ],
    responsibilities: [
      "Dirigir y coordinar todas las actividades del equipo de Multimedia",
      "Planificar estrategias y objetivos mensuales del ministerio",
      "Supervisar el cumplimiento de roles y responsabilidades",
      "Mantener comunicación efectiva entre todos los equipos",
      "Evaluar el desempeño y progreso del equipo",
      "Gestionar recursos y necesidades técnicas",
      "Representar al equipo ante el liderazgo de la iglesia",
    ],
  },
  {
    id: "photo-video",
    title: "Equipo de Fotografías y Videos",
    icon: Camera,
    color: "bg-gradient-to-br from-blue-500 to-cyan-500",
    members: [
      { name: "Nehemías Martinez" },
      { name: "Faustino Gómez" },
      { name: "Moisés Payeres" },
      { name: "Helem Menco" },
      { name: "Leidys Gómez" },
      { name: "Mileidys Payeres" },
    ],
    responsibilities: [
      "Capturar fotografías de alta calidad durante los servicios y eventos",
      "Grabar videos profesionales de predicaciones, testimonios y actividades",
      "Mantener y cuidar el equipo fotográfico y de video",
      "Asegurar una cobertura completa de todos los eventos importantes",
      "Coordinar ángulos y posiciones estratégicas de cámara",
      "Respaldar y organizar archivos multimedia de forma sistemática",
      "Estar disponible con anticipación para configurar equipos",
    ],
  },
  {
    id: "edition-design",
    title: "Edición y Diseño",
    icon: Palette,
    color: "bg-gradient-to-br from-purple-500 to-pink-500",
    members: [
      { name: "José Martínez" },
      { name: "Moisés Rodelo" },
      { name: "Yulissa Gómez" },
      { name: "Miguel Paredes" },
    ],
    responsibilities: [
      "Editar videos de predicaciones con calidad profesional",
      "Crear diseños gráficos para redes sociales y publicidad",
      "Desarrollar contenido visual atractivo y relevante",
      "Editar fotografías para publicaciones oficiales",
      "Diseñar material promocional para eventos",
      "Mantener consistencia en la identidad visual del ministerio",
      "Cumplir con plazos de entrega establecidos",
      "Optimizar contenido para diferentes plataformas digitales",
    ],
  },
  {
    id: "spiritual-support",
    title: "Espiritual y Apoyo",
    icon: Heart,
    color: "bg-gradient-to-br from-secondary to-yellow-600",
    members: [
      { name: "Yerlis Bohórquez" },
      { name: "Linet Salcedo" },
      { name: "Yuribel Pinto" },
      { name: "Mileidys Payares"}
    ],
    responsibilities: [
      "Interceder en oración por el equipo y sus actividades",
      "Brindar apoyo espiritual y emocional a los miembros",
      "Organizar momentos de oración antes de eventos importantes",
      "Velar por la unidad y armonía del equipo",
      "Fomentar el crecimiento espiritual colectivo",
      "Ser punto de contacto para necesidades personales del equipo",
      "Coordinar devocionales y momentos de comunión",
      "Promover un ambiente de servicio con excelencia",
    ],
  },
];

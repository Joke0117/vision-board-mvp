import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Target, CheckCircle2, Users, ThumbsUp } from "lucide-react";

const LogrosMetas = () => {
  const logros = [
    {
      icon: Users,
      title: "Crecimiento de Seguidores",
      description: "De 220 a 634 seguidores en Facebook",
      color: "text-blue-500",
    },
    {
      icon: ThumbsUp,
      title: "Mayor Interacción",
      description: "Aumento significativo en vistas e interacción del público",
      color: "text-green-500",
    },
  ];

  const metas = [
    {
      title: "Alcanzar 1,000 seguidores",
      deadline: "Octubre - Noviembre 2025",
      priority: "Alta",
    },
    {
      title: "Impartir la Palabra de Dios",
      deadline: "Continuo",
      priority: "Crítica",
    },
    {
      title: "Alimentar Instagram",
      deadline: "En progreso",
      priority: "Media",
    },
    {
      title: "Crear TikTok oficial",
      deadline: "Próximamente",
      priority: "Media",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <Navbar />
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3">
              Logros y Metas
            </h1>
            <p className="text-muted-foreground">
              Nuestro progreso y objetivos para el ministerio de Multimedia
            </p>
          </div>

          {/* Logros */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold">Logros Alcanzados</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {logros.map((logro, idx) => {
                const Icon = logro.icon;
                return (
                  <Card key={idx} className="border-2 hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Icon className={`h-6 w-6 ${logro.color}`} />
                        </div>
                        <CardTitle className="text-xl">{logro.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{logro.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Metas */}
          <section className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Target className="h-8 w-8 text-accent" />
              <h2 className="text-3xl font-bold">Metas del Equipo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {metas.map((meta, idx) => (
                <Card key={idx} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{meta.title}</CardTitle>
                      <Badge
                        variant={
                          meta.priority === "Crítica"
                            ? "destructive"
                            : meta.priority === "Alta"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {meta.priority}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      {meta.deadline}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Punto Importante */}
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                <CheckCircle2 className="h-7 w-7 text-primary" />
                Punto Importante a Tratar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">
                <strong>Cumplir con las tareas asignadas</strong> a cada miembro del equipo,
                manteniendo la excelencia y el compromiso con el ministerio de Multimedia.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LogrosMetas;

import { TeamSection } from "@/components/TeamSection";
import { teamsData } from "@/data/teamData";
import { Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Multimedia Visión Pentecostés
              </h1>
              <p className="text-muted-foreground mt-1">Panel Administrativo del Equipo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Intro Card */}
          <div className="bg-card rounded-2xl p-6 md:p-8 mb-8 shadow-lg border">
            <h2 className="text-2xl font-bold mb-3">Estructura del Equipo</h2>
            <p className="text-muted-foreground leading-relaxed">
              Nuestro equipo de Multimedia está organizado en cuatro áreas fundamentales, cada una con roles 
              específicos y responsabilidades claras. Haz clic en cada sección para ver los integrantes y 
              sus funciones.
            </p>
          </div>

          {/* Team Sections */}
          <TeamSection teams={teamsData} />

          {/* Footer Stats */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-6 text-center border">
              <div className="text-3xl font-bold text-primary mb-2">
                {teamsData.reduce((acc, team) => acc + team.members.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Miembros</div>
            </div>
            <div className="bg-card rounded-xl p-6 text-center border">
              <div className="text-3xl font-bold text-accent mb-2">{teamsData.length}</div>
              <div className="text-sm text-muted-foreground">Áreas de Trabajo</div>
            </div>
            <div className="bg-card rounded-xl p-6 text-center border">
              <div className="text-3xl font-bold text-secondary mb-2">
                {teamsData.reduce((acc, team) => acc + team.responsibilities.length, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Responsabilidades</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;

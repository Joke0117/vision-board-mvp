import { TeamSection } from "@/components/TeamSection";
import { teamsData } from "@/data/teamData";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 md:py-12 flex-1">
        <div className="max-w-5xl mx-auto">
          {/* Quick Access Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button
              onClick={() => navigate("/admin")}
              size="lg"
              className="h-24 text-lg font-semibold gap-3 shadow-lg hover:shadow-xl transition-all"
            >
              <LayoutDashboard className="w-6 h-6" />
              Panel Administrativo
            </Button>
            <Button
              onClick={() => navigate("/organigrama")}
              variant="secondary"
              size="lg"
              className="h-24 text-lg font-semibold gap-3 shadow-lg hover:shadow-xl transition-all"
            >
              <Users className="w-6 h-6" />
              Ver Organigrama
            </Button>
          </div>

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
      <Footer />
    </div>
  );
};

export default Index;

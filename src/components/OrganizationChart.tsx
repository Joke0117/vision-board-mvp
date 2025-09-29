import { useState } from "react";
import { teamsData } from "@/data/teamData";
import { Card } from "@/components/ui/card";

export const OrganizationChart = () => {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  const leadership = teamsData.find((t) => t.id === "leadership");
  const photoVideo = teamsData.find((t) => t.id === "photo-video");
  const edition = teamsData.find((t) => t.id === "edition-design");
  const spiritual = teamsData.find((t) => t.id === "spiritual-support");

  const MemberCard = ({ name, teamId }: { name: string; teamId: string }) => {
    const isHovered = hoveredMember === `${teamId}-${name}`;
    
    return (
      <div
        className={`px-4 py-2 rounded-lg border-2 transition-all cursor-pointer ${
          isHovered
            ? "bg-primary text-primary-foreground border-primary scale-105 shadow-lg"
            : "bg-card border-muted hover:border-primary/50"
        }`}
        onMouseEnter={() => setHoveredMember(`${teamId}-${name}`)}
        onMouseLeave={() => setHoveredMember(null)}
      >
        <p className="text-sm font-medium text-center">{name}</p>
      </div>
    );
  };

  const TeamBox = ({ title, members, teamId, color }: any) => {
    const isTeamHovered = members.some(
      (m: any) => hoveredMember === `${teamId}-${m.name}`
    );

    return (
      <Card
        className={`p-4 transition-all ${
          isTeamHovered ? "ring-2 ring-primary shadow-xl" : ""
        }`}
      >
        <div className={`${color} text-white rounded-lg p-3 mb-3`}>
          <h3 className="font-bold text-center">{title}</h3>
        </div>
        <div className="space-y-2">
          {members.map((member: any, idx: number) => (
            <MemberCard key={idx} name={member.name} teamId={teamId} />
          ))}
        </div>
      </Card>
    );
  };

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
          Equipo Multimedia de la Iglesia
        </h2>
        <p className="text-muted-foreground">
          Organigrama Funcional - Hover sobre los nombres para ver las conexiones
        </p>
      </div>

      {/* Organigrama */}
      <div className="flex flex-col items-center gap-6">
        {/* Nivel 1: Liderazgo */}
        <div className="w-full max-w-md">
          {leadership && (
            <TeamBox
              title={leadership.title}
              members={leadership.members}
              teamId={leadership.id}
              color={leadership.color}
            />
          )}
        </div>

        {/* Conector */}
        <div className="h-8 w-1 bg-gradient-to-b from-primary to-accent"></div>

        {/* Nivel 2: Equipos Operativos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          {photoVideo && (
            <TeamBox
              title={photoVideo.title}
              members={photoVideo.members}
              teamId={photoVideo.id}
              color={photoVideo.color}
            />
          )}
          {edition && (
            <TeamBox
              title={edition.title}
              members={edition.members}
              teamId={edition.id}
              color={edition.color}
            />
          )}
          {spiritual && (
            <TeamBox
              title={spiritual.title}
              members={spiritual.members}
              teamId={spiritual.id}
              color={spiritual.color}
            />
          )}
        </div>
      </div>
    </div>
  );
};

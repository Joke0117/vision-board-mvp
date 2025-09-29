import { Users, Camera, Palette, Heart } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface TeamMember {
  name: string;
  role?: string;
}

export interface TeamData {
  id: string;
  title: string;
  icon: typeof Users;
  color: string;
  members: TeamMember[];
  responsibilities: string[];
}

interface TeamSectionProps {
  teams: TeamData[];
}

export const TeamSection = ({ teams }: TeamSectionProps) => {
  return (
    <Accordion type="single" collapsible className="w-full space-y-4">
      {teams.map((team) => {
        const Icon = team.icon;
        return (
          <AccordionItem
            key={team.id}
            value={team.id}
            className="border rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow"
          >
            <AccordionTrigger className="px-6 py-5 hover:no-underline hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4 text-left">
                <div className={`p-3 rounded-xl ${team.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{team.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {team.members.length} {team.members.length === 1 ? 'miembro' : 'miembros'}
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6 pt-2">
              <div className="space-y-6">
                {/* Members Section */}
                <div>
                  <h4 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Integrantes
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {team.members.map((member, idx) => (
                      <Card key={idx} className="border-muted">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{member.name}</CardTitle>
                          {member.role && (
                            <CardDescription className="text-sm">{member.role}</CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Responsibilities Section */}
                <div>
                  <h4 className="font-semibold text-lg mb-3">Responsabilidades</h4>
                  <ul className="space-y-2">
                    {team.responsibilities.map((responsibility, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Badge variant="secondary" className="mt-1 shrink-0">
                          {idx + 1}
                        </Badge>
                        <span className="text-foreground leading-relaxed">{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

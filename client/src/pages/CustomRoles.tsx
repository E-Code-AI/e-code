import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Shield, Users, Settings, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TeamSummary {
  id: number;
  name: string;
  slug: string;
  role: "owner" | "admin" | "member" | "viewer";
  memberCount?: number;
}

const roleCapabilities = [
  {
    role: "Owner",
    description: "Full control over billing, members, projects, and team policies.",
  },
  {
    role: "Admin",
    description: "Manage members, projects, and most operational settings.",
  },
  {
    role: "Member",
    description: "Collaborate on team projects with standard workspace access.",
  },
  {
    role: "Viewer",
    description: "Read-only access for audit and stakeholder workflows.",
  },
];

export function CustomRoles() {
  const [, navigate] = useLocation();

  const { data: teams = [], isLoading, error } = useQuery<TeamSummary[]>({
    queryKey: ["/api/teams"],
    queryFn: async () => {
      const response = await fetch("/api/teams", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Failed to load teams");
      }
      const data = await response.json();
      return Array.isArray(data) ? data : data.teams || [];
    },
    staleTime: 30000,
  });

  const manageableTeams = teams.filter((team) => team.role === "owner" || team.role === "admin");

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Roles & Permissions
        </h1>
        <p className="text-muted-foreground mt-2">
          The active platform contract today is team-scoped roles, managed from team settings.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Access Model</CardTitle>
          <CardDescription>
            Custom organization-wide RBAC is not active on this platform yet. Team roles are the real permission model in production.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {roleCapabilities.map((item) => (
            <div key={item.role} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{item.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Settings
          </CardTitle>
          <CardDescription>
            Manage the roles that actually apply to live teams and projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading teams...</p>
          ) : error ? (
            <p className="text-sm text-destructive">{(error as Error).message}</p>
          ) : manageableTeams.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No teams available with permissions to manage roles.
            </p>
          ) : (
            <div className="space-y-3">
              {manageableTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                  data-testid={`custom-roles-team-${team.id}`}
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {team.role} access{team.memberCount ? ` • ${team.memberCount} members` : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/teams/${team.id}/settings`)}
                    data-testid={`button-open-team-settings-${team.id}`}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Team
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CustomRoles;

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Loader2, Plus, Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ProjectSummary {
  id: string | number;
  name: string;
  description?: string | null;
  visibility?: string;
  updatedAt?: string;
  template?: string | null;
}

interface MobileProjectsPanelProps {
  activeProjectId?: string | number;
  onOpenProject: (projectId: string | number) => void;
  className?: string;
}

const FAVORITES_KEY = 'ecode-mobile-project-favorites';

function readFavorites(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function writeFavorites(favorites: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
}

function normalizeProjects(payload: unknown): ProjectSummary[] {
  if (Array.isArray(payload)) return payload as ProjectSummary[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as { projects?: unknown[] }).projects)) {
    return (payload as { projects: ProjectSummary[] }).projects;
  }
  return [];
}

export function MobileProjectsPanel({ activeProjectId, onOpenProject, className }: MobileProjectsPanelProps) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(() => readFavorites());

  const { data, isLoading, isError } = useQuery({
    queryKey: ['/api/projects', 'mobile'],
    queryFn: async () => normalizeProjects(await apiRequest('GET', '/api/projects')),
  });

  const createProjectMutation = useMutation({
    mutationFn: async () =>
      apiRequest<ProjectSummary>('POST', '/api/projects', {
        name: 'Mobile Project',
        description: 'Created from E-Code mobile',
        visibility: 'private',
      }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      if (project?.id) onOpenProject(project.id);
    },
  });

  const filteredProjects = useMemo(() => {
    const projects = data || [];
    const needle = query.trim().toLowerCase();
    return projects
      .filter((project) => {
        if (!needle) return true;
        return [project.name, project.description, project.visibility, project.template]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));
      })
      .sort((a, b) => {
        const aFavorite = favorites.has(String(a.id));
        const bFavorite = favorites.has(String(b.id));
        if (aFavorite !== bFavorite) return aFavorite ? -1 : 1;
        return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
      });
  }, [data, favorites, query]);

  const toggleFavorite = (projectId: string | number) => {
    const next = new Set(favorites);
    const key = String(projectId);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setFavorites(next);
    writeFavorites(next);
  };

  return (
    <section className={cn('flex h-full min-h-0 flex-col bg-background', className)} data-testid="mobile-projects-panel">
      <div className="flex items-center gap-2 border-b px-3 py-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search projects"
            className="h-10 pl-9 text-[15px]"
            data-testid="mobile-project-search"
          />
        </div>
        <Button
          size="icon"
          className="h-10 w-10"
          onClick={() => createProjectMutation.mutate(undefined)}
          disabled={createProjectMutation.isPending}
          data-testid="mobile-project-create"
        >
          {createProjectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {isLoading && (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading projects
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[13px] text-destructive">
            Projects could not be loaded. Recent offline projects remain available from the device cache.
          </div>
        )}

        {!isLoading && !isError && filteredProjects.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <FolderOpen className="h-10 w-10 text-muted-foreground" />
            <p className="text-[13px] text-muted-foreground">No projects match this search.</p>
          </div>
        )}

        <div className="space-y-2">
          {filteredProjects.map((project) => {
            const isActive = String(project.id) === String(activeProjectId);
            const isFavorite = favorites.has(String(project.id));
            return (
              <article
                key={project.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-3',
                  isActive ? 'border-primary bg-primary/10' : 'border-border bg-card'
                )}
                data-testid={`mobile-project-${project.id}`}
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => onOpenProject(project.id)}
                >
                  <div className="truncate text-[15px] font-medium">{project.name}</div>
                  <div className="mt-1 truncate text-[12px] text-muted-foreground">
                    {project.description || project.visibility || 'Private workspace'}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => toggleFavorite(project.id)}
                  aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                  data-testid={`mobile-project-favorite-${project.id}`}
                >
                  <Star className={cn('h-4 w-4', isFavorite && 'fill-yellow-400 text-yellow-400')} />
                </Button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default MobileProjectsPanel;

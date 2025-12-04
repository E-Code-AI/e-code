import { useQuery } from '@tanstack/react-query';

interface ProblemsStatus {
  errors: number;
  warnings: number;
  total: number;
}

export function useProblemsCount(projectId: string | number) {
  const normalizedProjectId = String(projectId);
  
  const { data } = useQuery<ProblemsStatus>({
    queryKey: ['/api/projects', normalizedProjectId, 'problems'],
    refetchInterval: 15000,
    retry: false,
    staleTime: 10000,
  });

  return {
    errorsCount: data?.errors ?? 0,
    warningsCount: data?.warnings ?? 0,
    totalProblems: data?.total ?? 0,
  };
}

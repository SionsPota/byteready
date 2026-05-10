import { trpc } from "@/providers/trpc";

export function useProjects(resumeId: number) {
  const utils = trpc.useUtils();
  const projects = trpc.project.getByResume.useQuery({ resumeId }, { enabled: resumeId > 0 });
  const analyze = trpc.project.analyze.useMutation({
    onSuccess: () => utils.project.getByResume.invalidate({ resumeId }),
  });

  return {
    projects: projects.data || [],
    isLoading: projects.isLoading,
    analyze: analyze.mutate,
    isAnalyzing: analyze.isPending,
  };
}

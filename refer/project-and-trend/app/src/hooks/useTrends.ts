import { trpc } from "@/providers/trpc";

export function useTrends(resumeId: number) {
  const utils = trpc.useUtils();
  const trends = trpc.trend.getByResume.useQuery({ resumeId }, { enabled: resumeId > 0 });
  const analyze = trpc.trend.analyze.useMutation({
    onSuccess: () => utils.trend.getByResume.invalidate({ resumeId }),
  });

  return {
    trends: trends.data || [],
    isLoading: trends.isLoading,
    analyze: analyze.mutate,
    isAnalyzing: analyze.isPending,
  };
}

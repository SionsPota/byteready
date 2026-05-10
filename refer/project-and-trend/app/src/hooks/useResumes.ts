import { trpc } from "@/providers/trpc";

export function useResumes() {
  const utils = trpc.useUtils();
  const list = trpc.resume.list.useQuery();
  const create = trpc.resume.create.useMutation({
    onSuccess: () => utils.resume.list.invalidate(),
  });
  const remove = trpc.resume.delete.useMutation({
    onSuccess: () => utils.resume.list.invalidate(),
  });

  return {
    resumes: list.data || [],
    isLoading: list.isLoading,
    createResume: create.mutate,
    isCreating: create.isPending,
    deleteResume: remove.mutate,
    isDeleting: remove.isPending,
  };
}

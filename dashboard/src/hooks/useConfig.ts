import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface WindowEntry {
  id: string;
  name: string;
  verdict: "block" | "warn";
  recurrence?: {
    type: "range" | "cron";
    start?: string;
    end?: string;
  };
}

export function useWindows() {
  return useQuery({
    queryKey: ["config-windows"],
    queryFn: () =>
      api
        .get<{
          windows: WindowEntry[];
          updated_at: string | null;
        }>("/v1/config/windows")
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useUploadConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (yaml: string) =>
      api.post("/v1/config/upload", { yaml }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config-windows"] });
    },
  });
}

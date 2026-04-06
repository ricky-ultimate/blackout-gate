import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keysApi } from "@/lib/api";

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: () => keysApi.list().then((r) => r.data.keys),
    staleTime: 30_000,
  });
}

export function useRevokeKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => keysApi.revoke(keyId).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

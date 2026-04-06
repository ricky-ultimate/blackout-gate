import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { keysApi } from "@/lib/api";

export function useApiKeys(orgSlug: string) {
  return useQuery({
    queryKey: ["api-keys", orgSlug],
    queryFn: () => keysApi.list(orgSlug).then((r) => r.data.keys),
    enabled: !!orgSlug,
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

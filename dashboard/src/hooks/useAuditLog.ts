import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api";

export function useAuditLog(params: {
  repo?: string;
  environment?: string;
  outcome?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ["audit", params],
    queryFn: () => auditApi.list(params).then((r) => r.data),
    staleTime: 30_000,
  });
}

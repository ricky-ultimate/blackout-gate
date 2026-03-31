import { useMutation } from "@tanstack/react-query";
import { overrideApi } from "@/lib/api";

export function useIssueOverride() {
  return useMutation({
    mutationFn: overrideApi.issue,
  });
}

import { cn } from "@/lib/utils";

type Outcome = "allowed" | "blocked" | "warn" | "overridden";

const dotStyles: Record<Outcome, string> = {
  allowed: "bg-green-500",
  blocked: "bg-red-500",
  warn: "bg-amber-500",
  overridden: "bg-blue-500",
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  return (
    <span className="flex items-center gap-2 text-sm text-zinc-700 capitalize">
      <span
        className={cn("block h-1.5 w-1.5 rounded-full", dotStyles[outcome])}
      />
      {outcome}
    </span>
  );
}

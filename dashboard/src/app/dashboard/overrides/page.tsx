import { IssueOverrideModal } from "@/components/IssueOverrideModal";

export default function OverridesPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-black mb-3">
            Overrides
          </h1>
          <p className="text-sm text-zinc-500">
            Issue secure, single-use tokens to bypass active blackout
            constraints.
          </p>
        </div>
        <IssueOverrideModal />
      </div>
    </div>
  );
}

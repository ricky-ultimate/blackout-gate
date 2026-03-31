"use client";

import { useState } from "react";
import { addMonths, subMonths, format } from "date-fns";
import { BlackoutCalendar } from "@/components/BlackoutCalendar";
import { useWindows } from "@/hooks/useConfig";

export default function WindowsPage() {
  const [month, setMonth] = useState(new Date());
  const { data, isLoading } = useWindows();

  const windows = (data?.windows ?? []).flatMap((w) => {
    if (
      w.recurrence?.type === "range" &&
      w.recurrence.start &&
      w.recurrence.end
    ) {
      return [
        {
          id: w.id,
          name: w.name,
          start: w.recurrence.start,
          end: w.recurrence.end,
          verdict: w.verdict,
        },
      ];
    }
    return [];
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-end justify-between">
        <h1 className="text-4xl font-semibold tracking-tight text-black">
          Windows
        </h1>
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMonth((m) => subMonths(m, 1))}
            className="text-sm font-medium text-zinc-400 hover:text-black transition-colors"
          >
            Previous
          </button>
          <span className="text-base font-medium text-black w-32 text-center">
            {format(month, "MMMM yyyy")}
          </span>
          <button
            onClick={() => setMonth((m) => addMonths(m, 1))}
            className="text-sm font-medium text-zinc-400 hover:text-black transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-zinc-400">Loading windows...</p>}
      {!isLoading && windows.length === 0 && (
        <p className="text-sm text-zinc-400">
          No range windows configured. Upload your blackout.yaml in Settings.
        </p>
      )}

      <BlackoutCalendar month={month} windows={windows} />

      <div className="flex items-center gap-6 text-sm text-zinc-500 mt-2">
        <span className="flex items-center gap-2">
          <span className="block h-1.5 w-1.5 rounded-full bg-red-500" /> Blocked
          Window
        </span>
        <span className="flex items-center gap-2">
          <span className="block h-1.5 w-1.5 rounded-full bg-amber-500" />{" "}
          Warning Window
        </span>
      </div>
    </div>
  );
}

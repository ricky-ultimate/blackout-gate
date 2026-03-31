"use client";

import { useState } from "react";
import { addMonths, subMonths, format } from "date-fns";
import { BlackoutCalendar } from "@/components/BlackoutCalendar";

const EXAMPLE_WINDOWS = [
  {
    id: "q1-freeze",
    name: "Q1 Freeze",
    start: "2026-03-28T00:00:00",
    end: "2026-03-31T23:59:59",
    verdict: "block" as const,
  },
  {
    id: "black-friday",
    name: "Black Friday",
    start: "2026-11-27T00:00:00",
    end: "2026-11-30T23:59:59",
    verdict: "block" as const,
  },
];

export default function WindowsPage() {
  const [month, setMonth] = useState(new Date());

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

      <BlackoutCalendar month={month} windows={EXAMPLE_WINDOWS} />

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

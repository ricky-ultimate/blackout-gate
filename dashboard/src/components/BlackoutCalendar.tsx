"use client";

import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameMonth,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";

interface BlackoutWindow {
  id: string;
  name: string;
  start: string;
  end: string;
  verdict: "block" | "warn";
}

interface Props {
  month: Date;
  windows: BlackoutWindow[];
}

export function BlackoutCalendar({ month, windows }: Props) {
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  function getWindowsForDay(day: Date) {
    return windows.filter((w) => {
      try {
        return isWithinInterval(day, {
          start: parseISO(w.start),
          end: parseISO(w.end),
        });
      } catch {
        return false;
      }
    });
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="px-2 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-zinc-100 border border-zinc-100 rounded-2xl overflow-hidden">
        {days.map((day) => {
          const active = getWindowsForDay(day);
          const isCurrentMonth = isSameMonth(day, month);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-white min-h-[120px] p-3 flex flex-col gap-2",
                !isCurrentMonth && "bg-zinc-50/50",
              )}
            >
              <span
                className={cn(
                  "self-end text-sm font-medium",
                  isCurrentMonth ? "text-zinc-900" : "text-zinc-300",
                )}
              >
                {format(day, "d")}
              </span>
              <div className="flex flex-col gap-1">
                {active.map((w) => (
                  <div
                    key={w.id}
                    title={w.name}
                    className="flex items-center gap-1.5"
                  >
                    <span
                      className={cn(
                        "block h-1.5 w-1.5 shrink-0 rounded-full",
                        w.verdict === "block" ? "bg-red-500" : "bg-amber-500",
                      )}
                    />
                    <span className="truncate text-xs font-medium text-zinc-600">
                      {w.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

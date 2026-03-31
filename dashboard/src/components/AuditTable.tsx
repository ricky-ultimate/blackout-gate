"use client";

import { format } from "date-fns";
import { AuditEntry } from "@/lib/api";
import { OutcomeBadge } from "./OutcomeBadge";

interface Props {
  data: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (offset: number) => void;
}

export function AuditTable({
  data,
  total,
  limit,
  offset,
  onPageChange,
}: Props) {
  const page = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200">
              <th className="py-3 pr-4 font-medium text-zinc-400">
                Repository
              </th>
              <th className="px-4 py-3 font-medium text-zinc-400">Env</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Branch</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Actor</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Window</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Status</th>
              <th className="px-4 py-3 font-medium text-zinc-400">Reason</th>
              <th className="pl-4 py-3 font-medium text-zinc-400 text-right">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-400">
                  No records found.
                </td>
              </tr>
            )}
            {data.map((entry) => (
              <tr
                key={entry.id}
                className="group transition-colors hover:bg-zinc-50/50"
              >
                <td className="py-4 pr-4 font-mono text-xs text-zinc-900">
                  {entry.repo}
                </td>
                <td className="px-4 py-4 text-zinc-600 capitalize">
                  {entry.environment}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-zinc-500">
                  {entry.branch ?? "—"}
                </td>
                <td className="px-4 py-4 text-zinc-600">
                  {entry.triggered_by ?? "—"}
                </td>
                <td className="px-4 py-4 text-zinc-600">
                  {entry.window_name ?? "—"}
                </td>
                <td className="px-4 py-4">
                  <OutcomeBadge outcome={entry.outcome} />
                </td>
                <td
                  className="px-4 py-4 text-zinc-500 max-w-[200px] truncate"
                  title={entry.reason}
                >
                  {entry.reason}
                </td>
                <td className="pl-4 py-4 text-right text-zinc-400 whitespace-nowrap">
                  {format(new Date(entry.created_at), "MMM d, HH:mm")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-zinc-500 pt-4">
        <span>{total} records</span>
        <div className="flex items-center gap-6">
          <button
            disabled={page === 1}
            onClick={() => onPageChange(offset - limit)}
            className="font-medium text-zinc-900 disabled:text-zinc-300 transition-colors"
          >
            Previous
          </button>
          <span className="text-zinc-400">
            {page} / {totalPages || 1}
          </span>
          <button
            disabled={page === totalPages || totalPages === 0}
            onClick={() => onPageChange(offset + limit)}
            className="font-medium text-zinc-900 disabled:text-zinc-300 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

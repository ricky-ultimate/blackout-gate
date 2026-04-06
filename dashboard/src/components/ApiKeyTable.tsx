"use client";

import { format } from "date-fns";
import { ApiKey } from "@/lib/api";

interface Props {
  keys: ApiKey[];
  onRevoke: (id: string) => void;
  revoking: boolean;
}

export function ApiKeyTable({ keys, onRevoke, revoking }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="py-3 pr-4 font-medium text-zinc-400">Label</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Created</th>
            <th className="px-4 py-3 font-medium text-zinc-400">Last Used</th>
            <th className="pl-4 py-3 font-medium text-zinc-400 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {keys.length === 0 && (
            <tr>
              <td colSpan={4} className="py-12 text-center text-zinc-400">
                No keys found.
              </td>
            </tr>
          )}
          {keys.map((key) => (
            <tr key={key.id} className="hover:bg-zinc-50/50 transition-colors">
              <td className="py-4 pr-4 text-zinc-900">{key.label ?? "—"}</td>
              <td className="px-4 py-4 text-zinc-500">
                {format(new Date(key.created_at), "MMM d, yyyy")}
              </td>
              <td className="px-4 py-4 text-zinc-500">
                {key.last_used_at
                  ? format(new Date(key.last_used_at), "MMM d, yyyy HH:mm")
                  : "Never"}
              </td>
              <td className="pl-4 py-4 text-right">
                <button
                  onClick={() => onRevoke(key.id)}
                  disabled={revoking}
                  className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-30 transition-colors"
                >
                  Revoke
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

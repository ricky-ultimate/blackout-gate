"use client";

import { useState } from "react";
import { useAuditLog } from "@/hooks/useAuditLog";
import { AuditTable } from "@/components/AuditTable";
import { AuditFilters } from "@/components/AuditFilters";

export default function AuditPage() {
  const [filters, setFilters] = useState({
    repo: "",
    environment: "",
    outcome: "",
  });
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const { data, isLoading, isError } = useAuditLog({
    repo: filters.repo || undefined,
    environment: filters.environment || undefined,
    outcome: filters.outcome || undefined,
    limit,
    offset,
  });

  function handleFilter(f: typeof filters) {
    setFilters(f);
    setOffset(0);
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-8">
        <h1 className="text-4xl font-semibold tracking-tight text-black">
          Audit Log
        </h1>
        <AuditFilters onFilter={handleFilter} />
      </div>

      <div className="min-h-[400px]">
        {isLoading && <p className="text-sm text-zinc-400">Loading records...</p>}
        {isError && (
          <p className="text-sm text-red-500">Failed to load audit log.</p>
        )}
        {data && (
          <AuditTable
            data={data.data}
            total={data.total}
            limit={limit}
            offset={offset}
            onPageChange={setOffset}
          />
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

interface Filters {
  repo: string;
  environment: string;
  outcome: string;
}

interface Props {
  onFilter: (filters: Filters) => void;
}

export function AuditFilters({ onFilter }: Props) {
  const [repo, setRepo] = useState("");
  const [environment, setEnvironment] = useState("");
  const [outcome, setOutcome] = useState("");

  function apply() {
    onFilter({ repo, environment, outcome });
  }

  function reset() {
    setRepo("");
    setEnvironment("");
    setOutcome("");
    onFilter({ repo: "", environment: "", outcome: "" });
  }

  const inputClass =
    "h-10 rounded-lg bg-zinc-100/80 px-4 text-sm text-black placeholder:text-zinc-400 focus:bg-zinc-200/50 focus:outline-none transition-colors appearance-none";

  return (
    <div className="flex flex-wrap items-center gap-4">
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder="Repository"
        className={inputClass}
      />
      <select
        value={environment}
        onChange={(e) => setEnvironment(e.target.value)}
        className={inputClass}
      >
        <option value="">Environment</option>
        <option value="production">Production</option>
        <option value="staging">Staging</option>
        <option value="development">Development</option>
      </select>
      <select
        value={outcome}
        onChange={(e) => setOutcome(e.target.value)}
        className={inputClass}
      >
        <option value="">Outcome</option>
        <option value="allowed">Allowed</option>
        <option value="blocked">Blocked</option>
        <option value="warn">Warn</option>
        <option value="overridden">Overridden</option>
      </select>
      <div className="flex items-center gap-4 ml-2">
        <button
          onClick={apply}
          className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80"
        >
          Apply
        </button>
        <button
          onClick={reset}
          className="text-sm font-medium text-zinc-400 transition-colors hover:text-black"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

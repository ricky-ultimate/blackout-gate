"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setApiKey } from "@/lib/auth";
import { api } from "@/lib/api";

export default function LoginPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      setApiKey(key.trim());
      await api.get("/v1/audit", {
        headers: { Authorization: `Bearer ${key.trim()}` },
        params: { limit: 1 },
      });
      router.push("/dashboard/audit");
    } catch {
      setError("Invalid API key. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white px-6">
      <div className="m-auto w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-black">
          Sign In
        </h1>
        <p className="mb-10 text-sm text-zinc-500">
          Provide your organization's API key to access the gateway.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="API Key"
              className="w-full rounded-xl bg-zinc-100/80 px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:bg-zinc-200/50 focus:outline-none transition-colors"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !key}
            className="w-full rounded-full bg-black px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useIssueOverride } from "@/hooks/useOverrides";

export function IssueOverrideModal() {
  const [windowId, setWindowId] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [expiresIn, setExpiresIn] = useState("60");
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { mutate, isPending } = useIssueOverride();

  function submit() {
    mutate(
      {
        window_id: windowId,
        approved_by: approvedBy,
        expires_in_minutes: parseInt(expiresIn, 10),
      },
      {
        onSuccess: (res) => setToken(res.data.token),
      },
    );
  }

  function copy() {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setWindowId("");
    setApprovedBy("");
    setExpiresIn("60");
    setToken(null);
    setCopied(false);
  }

  const inputClass =
    "w-full rounded-xl bg-zinc-100/80 px-4 py-3 text-sm text-black placeholder:text-zinc-400 focus:bg-zinc-200/50 focus:outline-none transition-colors";

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80">
          Issue Token
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-white/80 backdrop-blur-sm z-40 transition-opacity" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl bg-white p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] focus:outline-none">
          <Dialog.Title className="text-xl font-semibold tracking-tight text-black mb-8">
            Issue Override
          </Dialog.Title>
          {token ? (
            <div className="flex flex-col gap-8">
              <p className="text-sm text-zinc-500 leading-relaxed">
                Provide this token to the engineer through a secure channel. It
                is single-use and will not be displayed again.
              </p>
              <div className="flex items-center gap-4">
                <code className="flex-1 truncate rounded-xl bg-zinc-100/80 px-4 py-3 text-sm font-mono text-zinc-600">
                  {token}
                </code>
                <button
                  onClick={copy}
                  className="text-sm font-medium text-black hover:text-zinc-600 transition-colors"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex justify-end pt-2">
                <Dialog.Close asChild>
                  <button className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:opacity-80 transition-opacity">
                    Done
                  </button>
                </Dialog.Close>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <input
                value={windowId}
                onChange={(e) => setWindowId(e.target.value)}
                placeholder="Window ID (e.g. q1-freeze)"
                className={inputClass}
              />
              <input
                value={approvedBy}
                onChange={(e) => setApprovedBy(e.target.value)}
                placeholder="Approved by (GitHub Handle)"
                className={inputClass}
              />
              <input
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                placeholder="Expiration (Minutes)"
                className={inputClass}
              />
              <div className="flex items-center justify-end gap-4 mt-6">
                <Dialog.Close asChild>
                  <button className="text-sm font-medium text-zinc-400 hover:text-black transition-colors">
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  onClick={submit}
                  disabled={isPending || !windowId || !approvedBy}
                  className="rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-30"
                >
                  {isPending ? "Generating..." : "Generate Token"}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

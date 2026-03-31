"use client";

import { useRef, useState } from "react";
import { getApiKey, clearApiKey } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useUploadConfig } from "@/hooks/useConfig";

export default function SettingsPage() {
  const key = getApiKey();
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { mutate: upload, isPending, isSuccess, isError } = useUploadConfig();

  function revoke() {
    clearApiKey();
    router.replace("/login");
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const yaml = ev.target?.result as string;
      if (yaml) upload(yaml);
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-10 max-w-xl">
      <h1 className="text-4xl font-semibold tracking-tight text-black">
        Settings
      </h1>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="mb-4 text-sm font-medium text-zinc-900">
            Active Access Key
          </h2>
          <div className="flex items-center gap-4">
            <code className="flex-1 rounded-xl bg-zinc-100/80 px-4 py-3 text-sm font-mono text-zinc-600">
              {revealed ? key : "•".repeat(32)}
            </code>
            <button
              onClick={() => setRevealed((r) => !r)}
              className="text-sm font-medium text-zinc-400 hover:text-black transition-colors"
            >
              {revealed ? "Hide" : "Reveal"}
            </button>
          </div>
          <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
            This key is stored securely in your browser's local storage.
          </p>
        </div>

        <div className="pt-8 border-t border-zinc-100">
          <h2 className="mb-4 text-sm font-medium text-zinc-900">
            Blackout Configuration
          </h2>
          <p className="mb-4 text-sm text-zinc-400 leading-relaxed">
            Upload your blackout.yaml to sync windows with the dashboard
            calendar.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".yaml,.yml"
            onChange={handleFile}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={isPending}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-30"
          >
            {isPending ? "Uploading..." : "Upload blackout.yaml"}
          </button>
          {isSuccess && (
            <p className="mt-3 text-sm text-green-600">
              Configuration uploaded. Calendar updated.
            </p>
          )}
          {isError && (
            <p className="mt-3 text-sm text-red-500">
              Upload failed. Check your file and try again.
            </p>
          )}
        </div>

        <div className="pt-8 border-t border-zinc-100">
          <button
            onClick={revoke}
            className="rounded-full bg-red-50 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            Sign out and remove key
          </button>
        </div>
      </div>
    </div>
  );
}

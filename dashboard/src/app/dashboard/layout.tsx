"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearApiKey, isAuthenticated } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

const nav = [
  { href: "/dashboard/audit", label: "Audit" },
  { href: "/dashboard/windows", label: "Windows" },
  { href: "/dashboard/overrides", label: "Overrides" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  function logout() {
    clearApiKey();
    router.replace("/login");
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-white">
        <header className="bg-white">
          <div className="mx-auto flex max-w-5xl items-baseline justify-between px-6 pt-12 pb-8">
            <div className="flex items-baseline gap-10">
              <span className="text-xl font-semibold tracking-tight text-black">
                Blackout
              </span>
              <nav className="flex gap-6">
                {nav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "text-sm font-medium transition-colors",
                      pathname === item.href
                        ? "text-black"
                        : "text-zinc-400 hover:text-black",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <button
              onClick={logout}
              className="text-sm font-medium text-zinc-400 hover:text-black transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}

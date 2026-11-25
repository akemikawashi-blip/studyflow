import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, GraduationCap, ShieldCheck } from "lucide-react";

import { InstallAppCard } from "@/components/pwa/install-app-card";

export const metadata: Metadata = {
  title: "Install",
  description: "Install Atlas Acadêmico on your phone, tablet, or computer.",
};

export default function InstallPage() {
  return (
    <main className="relative min-h-svh overflow-hidden px-4 py-8 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 15% 15%, rgb(222 224 255 / 0.8), transparent 30%), radial-gradient(circle at 85% 80%, rgb(133 246 229 / 0.35), transparent 28%)",
        }}
      />
      <section className="surface-panel relative z-10 mx-auto w-full max-w-2xl rounded-[2rem] p-6 sm:p-9">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="focus-ring inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-fixed/45"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Link>
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_rgb(36_56_156_/_0.2)]">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
        </div>

        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Atlas Acadêmico app
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Keep your student workspace one tap away.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
          One public link works on Android, iPhone, Windows, macOS, and tablets. Each person signs in to a private account.
        </p>

        <div className="my-8">
          <InstallAppCard />
        </div>

        <div className="flex items-start gap-3 rounded-card border border-outline-variant/55 bg-surface-container-low p-5">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-secondary" aria-hidden="true" />
          <p className="text-sm leading-6 text-muted-foreground">
            Installing the app does not share one user&apos;s records with another. Supabase authentication and Row Level Security keep account data separated.
          </p>
        </div>
      </section>
    </main>
  );
}

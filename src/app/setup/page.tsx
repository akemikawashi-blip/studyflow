import Link from "next/link";
import { CheckCircle2, Database, KeyRound, Terminal } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const steps = [
  {
    icon: Database,
    title: "Create a Supabase project",
    body: "Create one project and keep the project dashboard open.",
  },
  {
    icon: KeyRound,
    title: "Create .env.local",
    body: "Copy .env.example to .env.local and add the project URL and publishable key.",
  },
  {
    icon: Terminal,
    title: "Apply the database migration",
    body: "Open Supabase SQL Editor and run the migration files in numerical order, or link the CLI and run npm run db:push.",
  },
  {
    icon: CheckCircle2,
    title: "Restart Atlas Acadêmico",
    body: "Stop the development server with Ctrl+C and run npm run dev again.",
  },
];

export default function SetupPage() {
  const configured = isSupabaseConfigured();

  return (
    <main className="mx-auto min-h-svh max-w-4xl px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
          Phase 2 setup
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Connect Atlas Acadêmico to Supabase
        </h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          The frontend is ready. A Supabase project supplies authentication,
          PostgreSQL, and Row Level Security so each student receives private,
          persistent data.
        </p>

        <div className="mt-8 space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="rounded-3xl p-5 sm:p-6">
                <div className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Step {index + 1}
                    </p>
                    <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-8 rounded-3xl border border-outline-variant bg-surface-container-low p-5">
          <p className="font-semibold">
            Configuration status: {configured ? "Connected" : "Not connected"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            No service-role secret is required for normal app usage. Never put a
            service-role key in a browser-facing environment variable.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={configured ? "/signup" : "/setup"}
            className={buttonVariants({ variant: "default" })}
          >
            {configured ? "Create an account" : "Finish the steps above"}
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" })}
          >
            Open sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

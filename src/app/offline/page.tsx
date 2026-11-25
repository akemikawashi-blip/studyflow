import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="grid min-h-svh place-items-center px-4 py-10">
      <section className="surface-panel w-full max-w-md rounded-[2rem] p-7 text-center sm:p-9">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-fixed text-on-primary-fixed">
          <CloudOff className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em]">You are offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Atlas Acadêmico needs an internet connection to securely load and save your account data.
        </p>
        <Link
          href="/"
          className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Link>
      </section>
    </main>
  );
}

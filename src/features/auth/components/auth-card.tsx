import Link from "next/link";
import type { ReactNode } from "react";

import { AtlasMark } from "@/components/shared/atlas-mark";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthCard({
  title,
  description,
  children,
  footer,
}: AuthCardProps) {
  return (
    <section className="surface-panel w-full rounded-2xl p-6 sm:p-8 lg:p-10">
      <div className="mb-7">
        <Link
          href="/"
          className="focus-ring mb-6 inline-flex items-center gap-3 rounded-2xl"
        >
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-gold">
            <AtlasMark className="size-8" />
          </span>
          <span>
            <span className="block font-display text-2xl font-semibold text-primary">
              Atlas Acadêmico
            </span>
            <span className="block text-xs text-muted-foreground">
              Organização acadêmica pessoal
            </span>
          </span>
        </Link>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>

      {children}

      {footer ? (
        <div className="mt-6 border-t border-outline-variant/50 pt-5 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      ) : null}
    </section>
  );
}

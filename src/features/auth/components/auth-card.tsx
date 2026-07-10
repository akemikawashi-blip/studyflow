import Link from "next/link";
import type { ReactNode } from "react";
import { Download, GraduationCap } from "lucide-react";

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
    <section className="surface-panel w-full max-w-md rounded-[2rem] p-6 sm:p-8">
      <div className="mb-7">
        <Link
          href="/"
          className="focus-ring mb-6 inline-flex items-center gap-3 rounded-2xl"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_rgb(36_56_156_/_0.2)]">
            <GraduationCap className="size-6" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-xl font-semibold tracking-[-0.02em] text-primary">
              StudyFlow
            </span>
            <span className="block text-xs text-muted-foreground">
              Student Life Manager
            </span>
          </span>
        </Link>
        <h1 className="text-3xl font-semibold tracking-[-0.03em]">{title}</h1>
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

      <Link
        href="/install"
        className="focus-ring mt-4 flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-primary hover:bg-primary-fixed/45"
      >
        <Download className="size-4" aria-hidden="true" />
        Install StudyFlow on this device
      </Link>
    </section>
  );
}

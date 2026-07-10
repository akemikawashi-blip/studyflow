import type { ReactNode } from "react";

import { redirectAuthenticatedUser } from "@/lib/auth/current-user";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  await redirectAuthenticatedUser();

  return (
    <main className="relative grid min-h-svh place-items-center overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 15% 15%, rgb(222 224 255 / 0.8), transparent 30%), radial-gradient(circle at 85% 80%, rgb(133 246 229 / 0.35), transparent 28%)",
        }}
      />
      <div className="relative z-10 w-full">{children}</div>
    </main>
  );
}

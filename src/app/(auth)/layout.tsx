import type { ReactNode } from "react";

import { redirectAuthenticatedUser } from "@/lib/auth/current-user";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  await redirectAuthenticatedUser();

  return (
    <main className="relative grid min-h-svh place-items-center overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 15% 15%, rgb(226 231 239 / 0.9), transparent 32%), radial-gradient(circle at 85% 80%, rgb(223 232 222 / 0.7), transparent 30%)",
        }}
      />
      <div className="relative z-10 mx-auto w-full max-w-xl">{children}</div>
    </main>
  );
}

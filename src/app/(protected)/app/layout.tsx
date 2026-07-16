import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "ST";
}

export default async function ProtectedAppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();
  const supabase = await createClient();

  const [
    { data: profile },
    { data: preferences },
    { count: unreadNotifications },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select("theme")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false),
  ]);

  const fullName =
    profile?.full_name ??
    (typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : "Student");

  const themeClass =
    preferences?.theme === "dark"
      ? "dark"
      : preferences?.theme === "system"
        ? "theme-system"
        : undefined;

  return (
    <div className={`${themeClass ?? ""} min-h-svh bg-background text-foreground`}>
      <AppShell
        unreadNotifications={unreadNotifications ?? 0}
        user={{
          name: fullName,
          email: user.email ?? "",
          initials: initialsFromName(fullName),
        }}
      >
        {children}
      </AppShell>
    </div>
  );
}

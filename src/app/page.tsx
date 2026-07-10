import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/current-user";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    redirect("/setup");
  }

  const user = await getCurrentUser();
  redirect(user ? "/app/dashboard" : "/login");
}

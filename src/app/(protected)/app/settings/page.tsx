import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsManager } from "@/features/settings/components/settings-manager";
import { requireUser } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile, error: profileError }, { data: preferences, error: preferenceError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_preferences").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  const error = profileError || preferenceError;

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader title="Settings" description="Persist your profile, region, study goals, reminders and appearance preferences." />
      {error ? <div className="mt-7 rounded-card bg-error-container p-5 text-on-error-container"><p className="font-semibold">Settings could not be loaded.</p></div> : <div className="mt-7"><SettingsManager profile={profile} preferences={preferences} email={user.email ?? ""} /></div>}
    </PageContainer>
  );
}

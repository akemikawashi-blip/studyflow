import { DEFAULT_TIME_ZONE, isValidTimeZone } from "@/lib/dates";
import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function getTimeZone(supabase: ServerClient, userId: string) {
  const { data } = await supabase.from("user_preferences").select("time_zone").eq("user_id", userId).maybeSingle();
  return isValidTimeZone(data?.time_zone) ? data.time_zone : DEFAULT_TIME_ZONE;
}

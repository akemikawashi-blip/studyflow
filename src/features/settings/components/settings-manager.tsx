"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Bell, CircleUserRound, Globe2, LockKeyhole, MoonStar } from "lucide-react";

import { ActionMessage, FieldError, FormLabel, inputClass } from "@/components/forms/form-parts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updatePreferencesAction, updateProfileAction } from "@/features/settings/actions/settings-actions";
import { initialActionState } from "@/lib/forms/action-state";
import type { Database } from "@/types/database.generated";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Preferences = Database["public"]["Tables"]["user_preferences"]["Row"];

export function SettingsManager({ profile, preferences, email }: { profile: Profile | null; preferences: Preferences | null; email: string }) {
  const [profileState, profileAction, profilePending] = useActionState(updateProfileAction, initialActionState);
  const [preferenceState, preferenceAction, preferencePending] = useActionState(updatePreferencesAction, initialActionState);

  return (
    <div className="space-y-5">
      <Card id="profile" className="scroll-mt-24 p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3"><CircleUserRound className="mt-0.5 size-5 text-primary" /><div><h2 className="text-lg font-semibold">Profile</h2><p className="mt-1 text-sm text-muted-foreground">Update the identity and academic details shown across Atlas Acadêmico.</p></div></div>
        <form action={profileAction} className="space-y-5">
          <ActionMessage state={profileState} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div><FormLabel htmlFor="settings-full-name">Full name</FormLabel><input id="settings-full-name" name="fullName" defaultValue={profile?.full_name ?? ""} className={inputClass} /><FieldError state={profileState} field="fullName" /></div>
            <div><FormLabel htmlFor="settings-email">Email</FormLabel><input id="settings-email" value={email} readOnly className={`${inputClass} opacity-75`} /></div>
            <div><FormLabel htmlFor="settings-university">University</FormLabel><input id="settings-university" name="universityName" defaultValue={profile?.university_name ?? ""} className={inputClass} /></div>
            <div><FormLabel htmlFor="settings-department">Department</FormLabel><input id="settings-department" name="department" defaultValue={profile?.department ?? ""} className={inputClass} /></div>
            <div><FormLabel htmlFor="settings-year">Academic year</FormLabel><input id="settings-year" name="academicYear" defaultValue={profile?.academic_year ?? ""} className={inputClass} placeholder="3rd year / Semester 6" /></div>
          </div>
          <Button type="submit" disabled={profilePending}>{profilePending ? "Saving…" : "Save profile"}</Button>
        </form>
      </Card>

      <Card id="preferences" className="scroll-mt-24 p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3"><Globe2 className="mt-0.5 size-5 text-primary" /><div><h2 className="text-lg font-semibold">Regional, study and appearance preferences</h2><p className="mt-1 text-sm text-muted-foreground">These values drive money formatting, time calculations, goals, reminders and theme.</p></div></div>
        <form action={preferenceAction} className="space-y-6">
          <ActionMessage state={preferenceState} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div><FormLabel htmlFor="settings-currency">Currency</FormLabel><input id="settings-currency" name="currencyCode" defaultValue={preferences?.currency_code ?? "BDT"} maxLength={3} className={inputClass} /><FieldError state={preferenceState} field="currencyCode" /></div>
            <div><FormLabel htmlFor="settings-timezone">Time zone</FormLabel><input id="settings-timezone" name="timeZone" defaultValue={preferences?.time_zone ?? "Asia/Dhaka"} className={inputClass} /><FieldError state={preferenceState} field="timeZone" /></div>
            <div><FormLabel htmlFor="settings-date-format">Date format</FormLabel><select id="settings-date-format" name="dateFormat" defaultValue={preferences?.date_format ?? "dd-MM-yyyy"} className={inputClass}><option value="dd-MM-yyyy">DD-MM-YYYY</option><option value="MM-dd-yyyy">MM-DD-YYYY</option><option value="yyyy-MM-dd">YYYY-MM-DD</option></select></div>
            <div><FormLabel htmlFor="settings-week-start">Week starts on</FormLabel><select id="settings-week-start" name="weekStartsOn" defaultValue={preferences?.week_starts_on ?? 6} className={inputClass}><option value="1">Monday</option><option value="6">Saturday</option><option value="7">Sunday</option></select></div>
            <div><FormLabel htmlFor="settings-daily-goal">Daily study goal (minutes)</FormLabel><input id="settings-daily-goal" name="dailyStudyGoalMinutes" type="number" min="0" max="1440" defaultValue={preferences?.daily_study_goal_minutes ?? 60} className={inputClass} /></div>
            <div><FormLabel htmlFor="settings-weekly-goal">Weekly study goal (minutes)</FormLabel><input id="settings-weekly-goal" name="weeklyStudyGoalMinutes" type="number" min="0" max="10080" defaultValue={preferences?.weekly_study_goal_minutes ?? 420} className={inputClass} /></div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2"><MoonStar className="size-5 text-primary" /><h3 className="font-semibold">Theme</h3></div>
            <div className="flex flex-wrap gap-4">{["light", "dark", "system"].map((theme) => <label key={theme} className="inline-flex items-center gap-2 rounded-full border border-outline-variant px-4 py-2 text-sm font-medium"><input type="radio" name="theme" value={theme} defaultChecked={(preferences?.theme ?? "system") === theme} />{theme[0]?.toUpperCase()}{theme.slice(1)}</label>)}</div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2"><Bell className="size-5 text-primary" /><h3 className="font-semibold">Alerts</h3></div>
            <div className="grid gap-3 sm:grid-cols-2">{[
              ["assignmentReminders", "Assignment reminders", preferences?.assignment_reminders ?? true],
              ["taskReminders", "Task reminders", preferences?.task_reminders ?? true],
              ["habitReminders", "Habit reminders", preferences?.habit_reminders ?? true],
              ["budgetAlerts", "Budget alerts", preferences?.budget_alerts ?? true],
              ["studyGoalAlerts", "Study goal alerts", preferences?.study_goal_alerts ?? true],
            ].map(([name, label, checked]) => <label key={String(name)} className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container-low p-4 text-sm font-medium"><span>{String(label)}</span><input name={String(name)} type="checkbox" defaultChecked={Boolean(checked)} className="size-4" /></label>)}</div>
          </div>
          <Button type="submit" disabled={preferencePending}>{preferencePending ? "Saving…" : "Save preferences"}</Button>
        </form>
      </Card>

      <Card id="security" className="scroll-mt-24 p-5 sm:p-6">
        <div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 size-5 text-primary" /><div><h2 className="text-lg font-semibold">Security</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Password changes use the secure Supabase recovery flow.</p><Link href="/forgot-password" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-outline-variant px-5 text-sm font-semibold hover:border-primary">Send password reset email</Link></div></div>
      </Card>
    </div>
  );
}

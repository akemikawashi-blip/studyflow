"use client";

import Link from "next/link";
import { BellRing, CheckCheck, CircleAlert, Clock3, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { clearReadNotificationsAction, deleteNotificationAction, markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions/notification-actions";
import { formatDate } from "@/lib/display";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.generated";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

function tone(type: string) {
  if (type.includes("overdue") || type.includes("urgent")) return "error";
  if (type.includes("goal") || type.includes("study")) return "tertiary";
  return "primary";
}

const toneClasses = {
  primary: "bg-primary-fixed text-on-primary-fixed",
  tertiary: "bg-tertiary-container text-on-tertiary-container",
  error: "bg-error-container text-on-error-container",
};

export function NotificationManager({ notifications }: { notifications: Notification[] }) {
  const unread = notifications.filter((item) => !item.read).length;
  const read = notifications.length - unread;

  return (
    <div>
      <div className="mb-5 flex flex-wrap justify-end gap-3">
        <form action={markAllNotificationsReadAction}><Button type="submit" variant="outline" disabled={unread === 0}><CheckCheck className="size-4" />Mark all as read</Button></form>
        <form action={clearReadNotificationsAction} onSubmit={(event) => { if (read > 0 && !window.confirm("Delete all read notifications?")) event.preventDefault(); }}><Button type="submit" variant="outline" disabled={read === 0}><Trash2 className="size-4" />Clear read</Button></form>
      </div>
      <div className="flex flex-col gap-3">
        {notifications.length === 0 ? <div className="rounded-card border border-dashed border-outline-variant p-10 text-center"><p className="font-semibold">You are all caught up</p><p className="mt-2 text-sm text-muted-foreground">Upcoming task and assignment alerts will appear here automatically.</p></div> : notifications.map((item) => {
          const itemTone = tone(item.type);
          const Icon = itemTone === "error" ? CircleAlert : itemTone === "tertiary" ? Clock3 : BellRing;
          const safeLink = item.link?.startsWith("/app/") ? item.link : null;
          return (
            <Card key={item.id} className={cn("p-4 sm:p-5", !item.read && "border-primary/35 bg-primary-fixed/20")}>
              <div className="flex items-start gap-4">
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", toneClasses[itemTone])}><Icon className="size-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{safeLink ? <Link href={safeLink} className="hover:underline">{item.title}</Link> : item.title}</h2>{!item.read ? <span className="size-2 rounded-full bg-primary" aria-label="Unread" /> : null}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.message}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.created_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {!item.read ? <form action={markNotificationReadAction}><input type="hidden" name="id" value={item.id} /><Button type="submit" variant="ghost" size="sm">Mark read</Button></form> : null}
                  <form action={deleteNotificationAction}><input type="hidden" name="id" value={item.id} /><Button type="submit" variant="ghost" size="icon" className="text-destructive" aria-label={`Delete ${item.title}`}><Trash2 className="size-4" /></Button></form>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

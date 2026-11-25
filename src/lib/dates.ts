export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
const LOCALE = "pt-BR";

/** YYYY-MM-DD for `date` as seen in `timeZone`. */
export function dateKey(date: Date, timeZone: string = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

/** Parses a YYYY-MM-DD key as a UTC midnight Date (calendar arithmetic only). */
export function keyToDate(key: string) {
  return new Date(`${key}T00:00:00Z`);
}

export function addDays(key: string, days: number) {
  const date = keyToDate(key);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function daysBetween(fromKey: string, toKey: string) {
  return Math.round((keyToDate(toKey).getTime() - keyToDate(fromKey).getTime()) / 86_400_000);
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD key. */
export function weekday(key: string) {
  return keyToDate(key).getUTCDay();
}

/** Monday-based week containing `key`. */
export function weekKeys(key: string) {
  const offset = (weekday(key) + 6) % 7;
  const monday = addDays(key, -offset);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function monthGrid(key: string) {
  const first = `${key.slice(0, 7)}-01`;
  const start = addDays(first, -((weekday(first) + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function formatKey(key: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, { timeZone: "UTC", ...options }).format(keyToDate(key));
}

export function formatDateTime(value: string | Date, timeZone: string, options: Intl.DateTimeFormatOptions) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(LOCALE, { timeZone, ...options }).format(date);
}

export function relativeDayLabel(key: string, todayKey: string) {
  const days = daysBetween(todayKey, key);
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days === -1) return "Ontem";
  if (days < 0) return `Há ${Math.abs(days)} dias`;
  if (days < 7) return `Em ${days} dias`;
  return formatKey(key, { day: "2-digit", month: "short" });
}

export function greeting(timeZone: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "2-digit", hour12: false }).format(new Date()),
  );
  if (hour < 5) return "Boa noite";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function isValidTimeZone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function shortTime(value: string | null | undefined) {
  return value ? value.slice(0, 5) : "";
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function zoneOffset(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Converts a wall-clock date (YYYY-MM-DD) and time (HH:MM) in `timeZone` to an ISO instant. */
export function zonedToIso(dateKeyValue: string, time: string, timeZone: string) {
  const [hours, minutes] = (time || "00:00").split(":").map(Number);
  const naive = Date.parse(`${dateKeyValue}T00:00:00Z`) + (hours * 60 + minutes) * 60_000;
  let instant = naive - zoneOffset(naive, timeZone);
  instant = naive - zoneOffset(instant, timeZone);
  return new Date(instant).toISOString();
}

/** HH:MM of an instant as seen in `timeZone`. */
export function timeInZone(value: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

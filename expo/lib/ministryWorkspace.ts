// ── Ministry Workspace v2 helpers ──
// Shared, untyped Supabase access + small date helpers for the ministry tool screens.
//
// The generated `Database` type in `@/lib/supabase` predates most ministry tables
// (ministry_tasks, ministry_roster_slots, child_checkins, ...), so we talk to them
// through an untyped view of the same client and map rows to the interfaces below.
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as unknown as SupabaseClient<any, "public", any>;

export type MinistryRole = "member" | "leader" | "admin" | string;

export interface ProfileLite {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface WorkspaceMinistry {
  id: string;
  church_id: string;
  name: string;
  color: string | null;
  ministry_type: string | null;
  template: string | null;
}

/** Normalises a Supabase/Postgres error into a readable message. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message || fallback;
  const anyErr = err as { message?: string; details?: string; hint?: string };
  return anyErr.message || anyErr.details || anyErr.hint || fallback;
}

/** True when the error means the table / function does not exist yet (migration not applied). */
export function isMissingRelation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  if (!e) return false;
  return e.code === "42P01" || e.code === "PGRST205" || e.code === "PGRST202" || /does not exist|could not find/i.test(e.message || "");
}

export function displayName(p: { display_name?: string | null } | null | undefined, fallback = "Member"): string {
  return (p?.display_name || "").trim() || fallback;
}

// ── Dates ──
// All "date only" values are stored as `YYYY-MM-DD` and handled in local time.

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Next Sunday (or today when today is Sunday). */
export function nextSundayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
  return toISODate(d);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonthsISO(iso: string, months: number): string {
  const d = parseISODate(iso) ?? new Date();
  d.setMonth(d.getMonth() + months);
  return toISODate(d);
}

export function parseISODate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

export function isValidISODate(iso: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso.trim()) && parseISODate(iso) !== null;
}

/** Accepts "9:30", "09:30", "18:05". Returns normalised "HH:MM" or null. */
export function normaliseTime(value: string): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${pad(h)}:${pad(min)}`;
}

export function formatDate(iso: string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const d = parseISODate(iso) ?? (iso ? new Date(iso) : null);
  if (!d || isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", opts ?? { weekday: "short", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return "";
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso, { month: "short", day: "numeric" });
}

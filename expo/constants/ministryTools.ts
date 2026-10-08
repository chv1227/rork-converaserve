// ── Ministry Workspace tool registry ──
// Single source of truth for every tool shown in /ministry/[id]:
// what it is, where it goes, and which plan unlocks it.
//
// Tier map
//   Basic    : announcement threads, team roster, tasks, files (+ prayer list)
//   Standard : volunteer scheduling, attendance, children's check-in, recurring events
//   Pro      : automations / AI assistant (placeholder, "Coming soon")
//   null     : legacy tool that already worked for everyone (Song Library) - intentionally ungated
import type { ComponentType } from "react";
import { Alert } from "react-native";
import {
  Activity,
  Baby,
  Bell,
  Bot,
  Calendar,
  CalendarClock,
  CalendarRange,
  Check,
  ClipboardList,
  Clock,
  FileText,
  FolderOpen,
  Grid3X3,
  HandHeart,
  Heart,
  Megaphone,
  MessageCircle,
  Music,
  Shield,
  UserCheck,
  Users,
} from "lucide-react-native";
import type { PlanTier } from "@/hooks/usePlanAccess";

export type ToolIcon = ComponentType<{ size?: number; color?: string }>;

export type MinistryKind = "deacons" | "worship" | "children" | "default";

export interface ToolHandlerContext {
  ministryId: string;
  push: (href: string) => void;
}

export interface MinistryTool {
  id: string;
  label: string;
  desc: string;
  icon: ToolIcon;
  /** Lowest plan that unlocks the tool. `null` = always available. */
  minPlan: PlanTier | null;
  /** In-app destination. Receives the ministry id. */
  route?: (ministryId: string) => string;
  /** Used when there is no route (e.g. placeholders). */
  handler?: (ctx: ToolHandlerContext) => void;
  /** Shows a "Coming soon" tag. Still gated by `minPlan`. */
  comingSoon?: boolean;
}

const ministryRoute = (path: string) => (ministryId: string) => `/ministry/${ministryId}/${path}`;

const comingSoon = (label: string) => () =>
  Alert.alert(label, `${label} is coming soon. We'll let you know when it's ready for your ministry.`);

export const MINISTRY_TOOLS = {
  // ── Generic toolkit (every ministry) ──
  announcements: {
    id: "announcements",
    label: "Announcements",
    desc: "Leader updates for the team",
    icon: Megaphone,
    minPlan: "basic",
    route: ministryRoute("announcements"),
  },
  thread: {
    id: "thread",
    label: "Team Thread",
    desc: "Conversation for the whole team",
    icon: MessageCircle,
    minPlan: "basic",
    route: ministryRoute("thread"),
  },
  roster: {
    id: "roster",
    label: "Team Roster",
    desc: "Members, leaders & roles",
    icon: Users,
    minPlan: "basic",
    route: ministryRoute("roster"),
  },
  tasks: {
    id: "tasks",
    label: "Task List",
    desc: "Create, assign & complete tasks",
    icon: ClipboardList,
    minPlan: "basic",
    route: ministryRoute("tasks"),
  },
  files: {
    id: "files",
    label: "Files & Media",
    desc: "Shared documents & media",
    icon: FolderOpen,
    minPlan: "basic",
    route: ministryRoute("files"),
  },
  prayer: {
    id: "prayer",
    label: "Prayer List",
    desc: "Team prayer requests",
    icon: HandHeart,
    minPlan: "basic",
    route: ministryRoute("prayer"),
  },
  volunteers: {
    id: "volunteers",
    label: "Volunteer Schedule",
    desc: "Service slots & sign-ups",
    icon: CalendarClock,
    minPlan: "standard",
    route: ministryRoute("volunteers"),
  },
  attendance: {
    id: "attendance",
    label: "Attendance",
    desc: "Take attendance & see history",
    icon: UserCheck,
    minPlan: "standard",
    route: ministryRoute("attendance"),
  },
  events: {
    id: "events",
    label: "Recurring Events",
    desc: "Weekly & monthly gatherings",
    icon: CalendarRange,
    minPlan: "standard",
    route: ministryRoute("events"),
  },
  automations: {
    id: "automations",
    label: "Automations & AI",
    desc: "Reminders, follow-ups & AI assistant",
    icon: Bot,
    minPlan: "pro",
    comingSoon: true,
    handler: comingSoon("Automations & AI"),
  },

  // ── Deacons ──
  "care-visits": {
    id: "care-visits",
    label: "Care Visits",
    desc: "Track hospital & home visits",
    icon: Heart,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Care Visits"),
  },
  benevolence: {
    id: "benevolence",
    label: "Benevolence",
    desc: "Manage assistance requests",
    icon: HandHeart,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Benevolence"),
  },
  "prayer-assignments": {
    id: "prayer-assignments",
    label: "Prayer Assignments",
    desc: "Confidential prayer follow-up",
    icon: Bell,
    minPlan: "basic",
    route: ministryRoute("prayer"),
  },
  "service-schedule": {
    id: "service-schedule",
    label: "Service Schedule",
    desc: "Greeting & communion rotation",
    icon: Clock,
    minPlan: "standard",
    route: ministryRoute("volunteers"),
  },
  "meal-coordination": {
    id: "meal-coordination",
    label: "Meal Coordination",
    desc: "Organize meal deliveries",
    icon: ClipboardList,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Meal Coordination"),
  },
  reports: {
    id: "reports",
    label: "Reports",
    desc: "Attendance history & counts",
    icon: Activity,
    minPlan: "standard",
    route: ministryRoute("attendance"),
  },

  // ── Worship ──
  "worship-schedule": {
    id: "worship-schedule",
    label: "Schedule",
    desc: "Band & vocal rotation",
    icon: Calendar,
    minPlan: "standard",
    route: ministryRoute("volunteers"),
  },
  "song-library": {
    id: "song-library",
    label: "Song Library",
    desc: "Browse & manage songs",
    icon: Music,
    minPlan: null, // already live for everyone before v2 - keep ungated
    route: () => "/worship",
  },
  setlists: {
    id: "setlists",
    label: "Setlists",
    desc: "Create & share setlists",
    icon: Grid3X3,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Setlists"),
  },
  rehearsals: {
    id: "rehearsals",
    label: "Rehearsals",
    desc: "Upcoming rehearsal calendar",
    icon: Clock,
    minPlan: "standard",
    route: ministryRoute("events"),
  },
  "service-plans": {
    id: "service-plans",
    label: "Service Plans",
    desc: "Sunday service planning",
    icon: FileText,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Service Plans"),
  },
  "worship-roster": {
    id: "worship-roster",
    label: "Team Roster",
    desc: "Musicians & vocalists",
    icon: Users,
    minPlan: "basic",
    route: ministryRoute("roster"),
  },

  // ── Children ──
  classrooms: {
    id: "classrooms",
    label: "Classrooms",
    desc: "Kids grouped by classroom",
    icon: Users,
    minPlan: "standard",
    route: ministryRoute("checkin"),
  },
  checkin: {
    id: "checkin",
    label: "Check-In",
    desc: "Check children in & out",
    icon: Check,
    minPlan: "standard",
    route: ministryRoute("checkin"),
  },
  "child-profiles": {
    id: "child-profiles",
    label: "Child Profiles",
    desc: "View & manage child records",
    icon: Baby,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Child Profiles"),
  },
  lessons: {
    id: "lessons",
    label: "Lessons",
    desc: "Weekly curriculum & crafts",
    icon: FileText,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Lessons"),
  },
  "incident-reports": {
    id: "incident-reports",
    label: "Incident Reports",
    desc: "Log & track incidents",
    icon: Shield,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Incident Reports"),
  },
  "parent-messaging": {
    id: "parent-messaging",
    label: "Parent Messaging",
    desc: "Send updates to parents",
    icon: Bell,
    minPlan: "standard",
    comingSoon: true,
    handler: comingSoon("Parent Messaging"),
  },
} satisfies Record<string, MinistryTool>;

export type MinistryToolId = keyof typeof MINISTRY_TOOLS;

/** Ministry-specific tools ("Ministry Tools" section). `default` has none. */
export const MINISTRY_TYPE_TOOLS: Record<MinistryKind, MinistryToolId[]> = {
  deacons: ["care-visits", "benevolence", "prayer-assignments", "service-schedule", "meal-coordination", "reports"],
  worship: ["worship-schedule", "song-library", "setlists", "rehearsals", "service-plans", "worship-roster"],
  children: ["classrooms", "child-profiles", "checkin", "lessons", "incident-reports", "parent-messaging"],
  default: [],
};

/** Toolkit every ministry gets ("Team Toolkit" section). */
export const GENERIC_TOOL_IDS: MinistryToolId[] = [
  "roster",
  "tasks",
  "files",
  "announcements",
  "volunteers",
  "attendance",
  "events",
  "automations",
];

/** Quick Actions grid at the top of the workspace. `calendar` is the app-wide calendar tab. */
export type QuickActionId = MinistryToolId | "calendar";

export const QUICK_ACTION_IDS: QuickActionId[] = [
  "announcements",
  "thread",
  "calendar",
  "prayer",
  "tasks",
  "roster",
  "files",
  "volunteers",
  "attendance",
];

export const CALENDAR_QUICK_ACTION: MinistryTool = {
  id: "calendar",
  label: "Calendar",
  desc: "Church calendar",
  icon: Calendar,
  minPlan: null, // app-wide screen that is already available to everyone
  route: () => "/(tabs)/calendar",
};

export function getTool(id: QuickActionId): MinistryTool {
  if (id === "calendar") return CALENDAR_QUICK_ACTION;
  return MINISTRY_TOOLS[id];
}

/** Lookup by the screen's own id, used by tool screens to gate deep links. */
export function getToolPlan(id: MinistryToolId): PlanTier | null {
  return MINISTRY_TOOLS[id].minPlan;
}

/**
 * Works out which tool set applies.
 * Live data stores the type in `ministries.template` (ministry_type is usually null),
 * so check both and fall back to the name like the v1 screen did.
 */
export function resolveMinistryKind(m: {
  ministry_type?: string | null;
  template?: string | null;
  name?: string | null;
}): MinistryKind {
  const candidates = [m.ministry_type, m.template].map((v) => (v || "").toLowerCase().trim());
  const name = (m.name || "").toLowerCase();
  const matches = (key: string, ...aliases: string[]) =>
    candidates.some((c) => c === key || aliases.includes(c)) || [key, ...aliases].some((k) => name.includes(k));

  if (matches("deacons", "deacon")) return "deacons";
  if (matches("worship", "music")) return "worship";
  if (matches("children", "kids", "childrens")) return "children";
  return "default";
}

export function toolsForKind(kind: MinistryKind): MinistryTool[] {
  return MINISTRY_TYPE_TOOLS[kind].map((id) => MINISTRY_TOOLS[id]);
}

export function genericTools(): MinistryTool[] {
  return GENERIC_TOOL_IDS.map((id) => MINISTRY_TOOLS[id]);
}

export function quickActions(): MinistryTool[] {
  return QUICK_ACTION_IDS.map(getTool);
}

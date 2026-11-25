/**
 * ─────────────────────────────────────────────────────────────
 *  BRAND CONFIG — change everything about the studio's identity
 *  in this ONE file. No other file contains hard-coded brand
 *  strings (search the codebase: every label reads from here).
 * ─────────────────────────────────────────────────────────────
 */
export const BRAND = {
  /** Short studio name shown in the top bar, sidebar and titles */
  name: "Peace Staff",
  /** Full legal name shown on the login screen */
  legalName: "Peace Printing & Production Pvt. Ltd",
  /** Tagline under the brand name */
  tagline: "Studio Workspace",
  /** Portal descriptor on the login screen */
  portalDescriptor: "Internal Operations, Staff Management & Production Portal",
  /** Login card heading */
  loginTitle: "Staff Sign In",
  /** Login card subheading */
  loginSubtitle: "One sign-in for everyone — your Gmail account",
  /** Small credit line in footers */
  footerCredit: "Developed by Talha Askari",
  /** Help line for locked-out staff */
  supportNote: "Locked out? Please contact your studio administrator.",
};

/** Workspace accent palettes offered by the color switcher */
export const ACCENTS = [
  { id: "cobalt", label: "Cobalt" },
  { id: "indigo", label: "Indigo" },
  { id: "emerald", label: "Emerald" },
  { id: "rose", label: "Rose" },
];

/** Suggestion-box categories */
export const SUGGESTION_CATEGORIES = [
  { id: "workplace", label: "Workplace & Facilities" },
  { id: "workflow", label: "Workflow & Operations" },
  { id: "creative", label: "Creative & New Ideas" },
  { id: "concerns", label: "Concerns & Grievances" },
  { id: "general", label: "General Feedback" },
];

export const PRIORITIES = ["High", "Medium", "Low"];

export const STATUSES = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

/** Max characters for an anonymous suggestion */
export const SUGGESTION_MAX_LENGTH = 500;

/* ── Roles & permissions ───────────────────────────────────────────
   Three roles; the admin assigns them per member and can additionally
   fine-tune individual permissions per member (stored as overrides).
   `can()` in the store resolves: user override → role preset → false. */
export const ROLES = [
  { id: "admin", label: "Administrator" },
  { id: "core", label: "Core Team" },
  { id: "staff", label: "Staff" },
];

export const ROLE_LABELS = {
  admin: "Administrator",
  core: "Core Team",
  staff: "Staff",
};

export const PERMISSION_LABELS = {
  manageTasks: "Manage tasks",
  manageStaff: "Manage staff & access",
  manageAnnouncements: "Publish announcements",
  viewSuggestions: "View suggestions inbox",
  viewReports: "View daily reports",
};

export const PERMISSIONS = {
  admin: { manageTasks: true, manageStaff: true, manageAnnouncements: true, viewSuggestions: true, viewReports: true },
  core: { manageTasks: true, manageStaff: false, manageAnnouncements: true, viewSuggestions: true, viewReports: true },
  staff: { manageTasks: false, manageStaff: false, manageAnnouncements: false, viewSuggestions: false, viewReports: false },
};

export const ROLE_BLURBS = {
  admin: "Full access — everything, including staff management.",
  core: "Trusted team — manage tasks & announcements, view reports. No staff management.",
  staff: "Restricted — own tasks, schedule, suggestion box, daily report.",
};

/* ── Business identity: navigation, worlds, levels, awards, mascot ───
   Everything below is what makes this portal feel like YOUR business.
   The defaults are Peace's studio flavour — any other business changes
   ONLY the values here (never the keys) and the whole portal follows:
   sidebar, home, wall, leaderboard, mascot. The live Peace portal keeps
   these exact values, so it looks identical. */

/** Main navigation labels */
export const NAV_LABELS = {
  home: "Studio Home",
  wall: "Studio Wall",
};

/** Per-role home "worlds" — hero name, role title, tagline */
export const ROLE_WORLDS = {
  admin: { name: "Director's Console", title: "Director", tagline: "The whole studio, from your chair." },
  core: { name: "Edit Suite", title: "Editor", tagline: "Where the story comes together." },
  staff: { name: "Shoot Floor", title: "Crew", tagline: "Today's shots, on your call sheet." },
};

/** Gamification levels — `name` is the display name, `min` the XP threshold */
export const LEVELS = [
  { level: 1, name: "Rookie", min: 0 },
  { level: 2, name: "Crew", min: 100 },
  { level: 3, name: "Shooter", min: 250 },
  { level: 4, name: "Director", min: 500 },
  { level: 5, name: "Star", min: 1000 },
  { level: 6, name: "Legend", min: 2000 },
];

/** Monthly top-performer award label on the leaderboard */
export const TOP_PERFORMER_LABEL = "Crew of the Month";

/** Mascot — display name shown under the character */
export const MASCOT = {
  name: "Clappy",
};

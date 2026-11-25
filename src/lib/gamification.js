/* Gamification — XP, levels, badges. Pure functions over the app's data,
 * so the leaderboard, the sidebar XP chip and the level-up check all agree. */

export const XP = { TASK_DONE: 20, TASK_EARLY: 10, REPORT: 15 };

export const LEVELS = [
  { level: 1, name: "Rookie", min: 0 },
  { level: 2, name: "Crew", min: 100 },
  { level: 3, name: "Shooter", min: 250 },
  { level: 4, name: "Director", min: 500 },
  { level: 5, name: "Star", min: 1000 },
  { level: 6, name: "Legend", min: 2000 },
];

/* levelFor(180) → { level: 2, name: "Crew", min: 100, nextMin: 250, progress: 0.53 } */
export function levelFor(xp) {
  let cur = LEVELS[0];
  let next = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].min) cur = LEVELS[i];
    else { next = LEVELS[i]; break; }
  }
  const progress = next ? (xp - cur.min) / (next.min - cur.min) : 1;
  return { ...cur, nextMin: next ? next.min : null, nextName: next ? next.name : null, progress: Math.max(0, Math.min(1, progress)) };
}

export function xpTotalFor(xpEvents, userId) {
  return (xpEvents || []).filter((e) => e.userId === userId).reduce((s, e) => s + (e.points || 0), 0);
}

/* XP earned inside the current calendar month (for Crew of the Month). */
export function monthXpFor(xpEvents, userId, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  return (xpEvents || [])
    .filter((e) => e.userId === userId && e.at && new Date(e.at).getFullYear() === y && new Date(e.at).getMonth() === m)
    .reduce((s, e) => s + (e.points || 0), 0);
}

/* Consecutive-day completion streak ending today (or yesterday, if nothing
 * was finished yet today). Dates are local YYYY-MM-DD. */
export function streakFor(xpEvents, userId) {
  const days = new Set(
    (xpEvents || [])
      .filter((e) => e.userId === userId && e.kind === "task_done" && e.at)
      .map((e) => {
        const d = new Date(e.at);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
  );
  if (days.size === 0) return 0;
  const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  let cursor = new Date(today);
  if (!days.has(toISO(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(toISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export const BADGES = [
  { id: "first-shot", name: "First Shot", desc: "Complete your first task", icon: "target" },
  { id: "sharpshooter", name: "Sharpshooter", desc: "Complete 10 tasks", icon: "crosshair" },
  { id: "century", name: "Century", desc: "Earn 100 XP", icon: "zap" },
  { id: "reporter", name: "Reporter", desc: "Submit 5 daily reports", icon: "file-text" },
  { id: "hot-streak", name: "Hot Streak", desc: "Finish a task 3 days in a row", icon: "flame" },
  { id: "early-bird", name: "Early Bird", desc: "Finish a task before its due date", icon: "sunrise" },
];

/* Everything the leaderboard needs for one member. */
export function userStats({ userId, xpEvents = [], tasks = [], reports = [] }) {
  const xp = xpTotalFor(xpEvents, userId);
  const done = tasks.filter((t) => t.assigneeId === userId && t.status === "done").length;
  const reportCount = reports.filter((r) => r.userId === userId).length;
  const early = xpEvents.filter((e) => e.userId === userId && e.kind === "task_early").length;
  const streak = streakFor(xpEvents, userId);
  const earned = [];
  if (done >= 1) earned.push("first-shot");
  if (done >= 10) earned.push("sharpshooter");
  if (xp >= 100) earned.push("century");
  if (reportCount >= 5) earned.push("reporter");
  if (streak >= 3) earned.push("hot-streak");
  if (early >= 1) earned.push("early-bird");
  return { xp, level: levelFor(xp), done, reportCount, early, streak, badges: earned, monthXp: monthXpFor(xpEvents, userId) };
}

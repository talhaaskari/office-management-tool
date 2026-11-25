import { useMemo } from "react";
import { CalendarDays, CalendarCheck } from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { EmptyState } from "./ui.jsx";
import { dueBucket, formatDate } from "../lib/dates.js";
import { PriorityBadge, StatusBadge } from "./TasksBoard.jsx";

/**
 * My Schedule — ONLY the logged-in user's tasks, sorted by due date.
 * Counters are computed from the same list, so they always add up.
 */
export default function Schedule() {
  const { tasks, currentUser, theme } = useApp();
  const dark = theme.mode === "dark";

  const mine = useMemo(() => {
    return tasks
      .filter((t) => t.assigneeId === currentUser?.id)
      .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
  }, [tasks, currentUser]);

  const buckets = useMemo(() => {
    const b = { overdue: [], today: [], week: [], later: [], done: [] };
    mine.forEach((t) => b[dueBucket(t)].push(t));
    return b;
  }, [mine]);

  const counters = [
    { label: "Overdue", value: buckets.overdue.length, tone: buckets.overdue.length ? "rose" : undefined },
    { label: "Due Today", value: buckets.today.length },
    { label: "Next 7 Days", value: buckets.week.length },
    { label: "Completed", value: buckets.done.length },
  ];

  const groups = [
    { id: "overdue", title: "Overdue", tone: "rose" },
    { id: "today", title: "Due Today", tone: "amber" },
    { id: "week", title: "Next 7 Days", tone: "accent" },
    { id: "later", title: "Later", tone: null },
    { id: "done", title: "Completed", tone: "emerald" },
  ];

  return (
    <div>
      <div className="mb-5">
        <h2 className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>My Schedule</h2>
        <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Upcoming deadlines & studio schedule — only tasks assigned to you.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {counters.map((c) => (
          <div key={c.label} className="glass rounded-3xl p-4">
            <div className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-slate-500" : "text-slate-400"}`}>{c.label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${c.tone === "rose" ? "text-rose-500" : dark ? "text-white" : "text-slate-900"}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {mine.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={24} />}
          title="No deliverables scheduled yet"
          body="Tasks assigned to you will appear here with priority flags and time alerts."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const items = buckets[g.id];
            if (!items.length) return null;
            return (
              <div key={g.id}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays size={15} className={
                    g.tone === "rose" ? "text-rose-500" : g.tone === "amber" ? "text-amber-500" : g.tone === "emerald" ? "text-emerald-500" : "accent-text"
                  } />
                  <h3 className={`text-sm font-bold uppercase tracking-wider ${dark ? "text-slate-200" : "text-slate-700"}`}>
                    {g.title} <span className="font-mono opacity-70">({items.length})</span>
                  </h3>
                </div>
                <div className="space-y-2">
                  {items.map((t) => (
                    <div key={t.id} className={`glass rounded-2xl px-4 py-3 flex items-center gap-4 flex-wrap ${g.id === "overdue" ? "ring-1 ring-rose-500/40" : ""}`}>
                      <div className="flex-1 min-w-[200px]">
                        <div className={`text-[11px] font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>{t.code} · {t.project}</div>
                        <div className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{t.title}</div>
                      </div>
                      <PriorityBadge priority={t.priority} />
                      <StatusBadge status={t.status} />
                      <span className={`text-xs font-mono font-semibold ${g.id === "overdue" ? "text-rose-500" : dark ? "text-slate-300" : "text-slate-600"}`}>
                        {formatDate(t.dueDate)}
                      </span>
                      <span className={`text-xs font-mono font-bold accent-text`}>{t.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

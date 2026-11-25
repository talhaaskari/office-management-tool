import { useEffect, useMemo, useRef, useState } from "react";
import {
  Clapperboard, Clock, MonitorPlay, Maximize, UserCheck, Palmtree,
  Megaphone, CalendarDays, AlertTriangle, Trophy,
} from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { isOverdue, todayISO, formatDate } from "../lib/dates.js";

/* Live Studio Wall — the office TV dashboard. Big type, live clock,
 * today's shoots, who's on set, who's on leave, next up, and a scrolling
 * announcements ticker. Hit Present for fullscreen. */

function Tile({ title, icon, children, accent }) {
  const { theme } = useApp();
  const dark = theme.mode === "dark";
  return (
    <div className="glass rounded-3xl p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="accent-text">{icon}</span>
        <h3 className={`font-bold ${accent ? "text-base" : "text-sm"} uppercase tracking-wider ${dark ? "text-white" : "text-slate-900"}`}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function StudioWall() {
  const { tasks, users, announcements, pendingApprovals, leaveRequests, theme, can } = useApp();
  const dark = theme.mode === "dark";
  const [now, setNow] = useState(() => new Date());
  const wallRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const today = todayISO();
  const dueToday = tasks.filter((t) => t.dueDate === today);
  const onSet = useMemo(() => {
    const ids = new Set(
      tasks.filter((t) => (t.dueDate === today || t.status === "in-progress") && t.status !== "done").map((t) => t.assigneeId)
    );
    return users.filter((u) => ids.has(u.id));
  }, [tasks, users, today]);
  const onLeaveToday = leaveRequests.filter(
    (l) => l.status === "approved" && l.startDate <= today && l.endDate >= today
  );
  const nextUp = [...tasks]
    .filter((t) => t.status !== "done" && t.dueDate && t.dueDate >= today)
    .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""))[0];
  const pendingCount = pendingApprovals.filter((r) => r.status === "pending").length;
  const overdueCount = tasks.filter(isOverdue).length;

  const nameOf = (id) => users.find((u) => u.id === id)?.name || "Unassigned";
  const clock = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateLine = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const tickerItems = announcements.length > 0 ? announcements.map((a) => a.title) : ["Welcome to the studio — no announcements right now."];
  const ticker = [...tickerItems, ...tickerItems];

  const present = () => {
    const el = wallRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div ref={wallRef} className="relative">
      {/* header: live clock */}
      <div className="glass rounded-3xl p-6 sm:p-8 mb-5 relative overflow-hidden">
        <div className="absolute -right-10 -top-16 w-72 h-72 rounded-full blur-[90px] pointer-events-none" style={{ background: "var(--glow-1)" }} aria-hidden="true" />
        <div className="relative flex items-end justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="anim-rec-dot w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
              <span className={`text-xs font-bold uppercase tracking-[.25em] ${dark ? "text-slate-400" : "text-slate-500"}`}>Studio Wall · Live</span>
            </div>
            <div className={`font-mono font-extrabold tracking-tight leading-none mt-2 text-5xl sm:text-6xl ${dark ? "text-white" : "text-slate-900"}`}>
              {clock}
            </div>
            <div className={`text-sm mt-2 ${dark ? "text-slate-400" : "text-slate-500"}`}>{dateLine}</div>
          </div>
          <button
            onClick={present}
            className="btn-shutter btn-shine flex items-center gap-2 accent-gradient-bg text-white text-sm font-bold px-5 py-3 rounded-2xl transition hover:opacity-90"
          >
            <Maximize size={16} /> Present
          </button>
        </div>
      </div>

      {/* tiles */}
      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Tile title="Today's shoots" icon={<Clapperboard size={18} />}>
          {dueToday.length === 0 ? (
            <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>No shoots today — clear floor.</p>
          ) : (
            <ul className="space-y-3">
              {dueToday.slice(0, 6).map((t) => (
                <li key={t.id} className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${t.status === "done" ? "bg-emerald-500" : t.status === "in-progress" ? "bg-amber-500" : "bg-slate-400"}`} />
                  <div className="min-w-0 flex-1">
                    <div className={`font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>{t.title}</div>
                    <div className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>{t.code} · {nameOf(t.assigneeId)}</div>
                  </div>
                  <span className={`text-sm font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{t.progress}%</span>
                </li>
              ))}
              {dueToday.length > 6 && (
                <li className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>+{dueToday.length - 6} more shoots today</li>
              )}
            </ul>
          )}
        </Tile>

        <Tile title="On set now" icon={<UserCheck size={18} />}>
          {onSet.length === 0 ? (
            <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Nobody on a shoot right now.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {onSet.map((u) => (
                <span key={u.id} className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm font-bold ${dark ? "bg-white/5 text-slate-200" : "bg-slate-100 text-slate-700"}`}>
                  <span className="w-7 h-7 rounded-xl accent-gradient-bg text-white flex items-center justify-center text-xs font-extrabold">{u.name.charAt(0)}</span>
                  {u.name}
                </span>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Palmtree size={15} className="accent-text" />
              <span className={`text-xs font-bold uppercase tracking-wider ${dark ? "text-slate-400" : "text-slate-500"}`}>On leave today</span>
            </div>
            {onLeaveToday.length === 0 ? (
              <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Everyone's in.</p>
            ) : (
              <ul className="space-y-1.5">
                {onLeaveToday.map((l) => (
                  <li key={l.id} className={`text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                    <span className="font-bold">{nameOf(l.userId)}</span> — {l.type} until {formatDate(l.endDate)}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Tile>

        <Tile title="Next up" icon={<Clock size={18} />}>
          {nextUp ? (
            <div>
              <div className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{nextUp.title}</div>
              <div className={`text-sm mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                {nextUp.code} · {nameOf(nextUp.assigneeId)} · due {formatDate(nextUp.dueDate)}
              </div>
              <div className={`h-2.5 rounded-full mt-3 overflow-hidden ${dark ? "bg-white/10" : "bg-slate-200"}`}>
                <div className="h-full accent-gradient-bg rounded-full transition-all" style={{ width: `${nextUp.progress}%` }} />
              </div>
              <div className={`text-xs mt-1.5 font-mono ${dark ? "text-slate-400" : "text-slate-500"}`}>{nextUp.progress}% done</div>
            </div>
          ) : (
            <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Nothing scheduled — the floor is yours.</p>
          )}
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className={`text-[11px] font-mono px-3 py-1.5 rounded-xl ${dark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
              {tasks.filter((t) => t.status !== "done").length} open tasks
            </span>
            {overdueCount > 0 && (
              <span className="text-[11px] font-mono px-3 py-1.5 rounded-xl font-bold bg-rose-500/15 text-rose-500 flex items-center gap-1">
                <AlertTriangle size={11} /> {overdueCount} overdue
              </span>
            )}
          </div>
        </Tile>

        <Tile title="Studio pulse" icon={<Megaphone size={18} />}>
          {can("manageStaff") && pendingCount > 0 && (
            <p className={`text-sm mb-3 ${dark ? "text-slate-300" : "text-slate-600"}`}>
              <span className="font-extrabold text-rose-500">{pendingCount} approval{pendingCount === 1 ? "" : "s"}</span> waiting in Approvals.
            </p>
          )}
          {announcements.length === 0 ? (
            <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>No announcements yet.</p>
          ) : (
            <div>
              <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{announcements[0].title}</div>
              <p className={`text-sm mt-1 line-clamp-3 ${dark ? "text-slate-400" : "text-slate-500"}`}>{announcements[0].body}</p>
            </div>
          )}
          <div className={`flex items-center gap-2 mt-4 text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
            <CalendarDays size={13} />
            <span>{tasks.filter((t) => t.status === "done").length} tasks done overall · {users.length} crew members</span>
          </div>
        </Tile>
      </div>

      {/* announcements ticker */}
      <div className="glass rounded-3xl overflow-hidden py-3 relative">
        <div className="flex whitespace-nowrap anim-ticker will-change-transform">
          {ticker.map((item, i) => (
            <span key={i} className={`inline-flex items-center gap-2 mx-6 text-sm font-bold ${dark ? "text-slate-300" : "text-slate-600"}`}>
              <Trophy size={13} className="accent-text shrink-0" /> {item}
            </span>
          ))}
        </div>
      </div>
      <p className={`text-center text-xs mt-4 ${dark ? "text-slate-600" : "text-slate-400"}`}>
        Tip: open this on the office TV and hit Present — it stays live on its own.
      </p>
    </div>
  );
}

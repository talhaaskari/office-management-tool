import { useLayoutEffect, useRef, useState } from "react";
import {
  ClipboardList, CalendarDays, MessageSquareHeart, ShieldCheck,
  Users, Megaphone, Inbox, FileBarChart, FileText, Palette, UserCheck, Clapperboard,
  MonitorPlay, Palmtree, Trophy,
} from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { isOverdue } from "../lib/dates.js";
import { levelFor, xpTotalFor } from "../lib/gamification.js";

/**
 * Sidebar nav. Badges always reflect REAL counts:
 * - Task Board badge = my open (not done) tasks
 * - Admin suggestions badge = unread suggestion count is not tracked, so show total
 * Administration items appear only for permissions the signed-in member has.
 */
export default function Sidebar({ view, setView, mobileOpen, setMobileOpen }) {
  const { currentUser, tasks, suggestions, pendingApprovals, leaveRequests, xpEvents, theme, can } = useApp();
  const dark = theme.mode === "dark";

  const myOpenTasks = tasks.filter((t) => t.assigneeId === currentUser?.id && t.status !== "done").length;
  const overdueMine = tasks.filter((t) => t.assigneeId === currentUser?.id && isOverdue(t)).length;
  const pendingCount = pendingApprovals.filter((r) => r.status === "pending").length;
  const pendingLeaveCount = leaveRequests.filter((l) => l.status === "pending").length;
  const myPendingLeave = leaveRequests.filter((l) => l.userId === currentUser?.id && l.status === "pending").length;
  const myXp = currentUser ? xpTotalFor(xpEvents, currentUser.id) : 0;
  const myLevel = levelFor(myXp);

  const staffItems = [
    { id: "home", label: "Studio Home", icon: <Clapperboard size={18} /> },
    { id: "wall", label: "Studio Wall", icon: <MonitorPlay size={18} /> },
    { id: "tasks", label: "Task Board", icon: <ClipboardList size={18} />, badge: myOpenTasks || null },
    { id: "schedule", label: "My Schedule", icon: <CalendarDays size={18} />, badge: overdueMine || null, badgeTone: "rose" },
    { id: "leave", label: "Leave", icon: <Palmtree size={18} />, badge: myPendingLeave || null, badgeTone: "rose" },
    { id: "leaderboard", label: "Leaderboard", icon: <Trophy size={18} /> },
    { id: "suggestions", label: "Suggestion Box", icon: <MessageSquareHeart size={18} /> },
    { id: "report", label: "Daily Report", icon: <FileText size={18} /> },
  ];
  const adminItems = [
    { id: "admin-tasks", label: "Manage Tasks", icon: <ClipboardList size={18} />, perm: "manageTasks" },
    { id: "admin-staff", label: "Staff", icon: <Users size={18} />, perm: "manageStaff" },
    { id: "admin-approvals", label: "Approvals", icon: <UserCheck size={18} />, perm: "manageStaff", badge: pendingCount || null, badgeTone: "rose" },
    { id: "admin-leave", label: "Leave Requests", icon: <Palmtree size={18} />, perm: "manageStaff", badge: pendingLeaveCount || null, badgeTone: "rose" },
    { id: "admin-announcements", label: "Announcements", icon: <Megaphone size={18} />, perm: "manageAnnouncements" },
    { id: "admin-suggestions", label: "Suggestions", icon: <Inbox size={18} />, perm: "viewSuggestions", badge: suggestions.length || null },
    { id: "admin-reports", label: "Daily Reports", icon: <FileBarChart size={18} />, perm: "viewReports" },
    { id: "admin-branding", label: "Branding & Theme", icon: <Palette size={18} />, perm: "manageStaff" },
  ].filter((item) => can(item.perm));

  // Playhead indicator: a vertical bar that slides to the active nav item,
  // like the playhead on an edit timeline.
  const itemRefs = useRef({});
  const [playhead, setPlayhead] = useState({ top: 0, height: 0, group: null });
  useLayoutEffect(() => {
    const el = itemRefs.current[view];
    if (!el) { setPlayhead((p) => (p.group === null ? p : { ...p, group: null })); return; }
    const group = staffItems.some((i) => i.id === view) ? "staff" : "admin";
    setPlayhead({ top: el.offsetTop, height: el.offsetHeight, group });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, adminItems.length]);

  const playheadBar = (group) => (
    <div
      className="playhead-bar absolute left-0 w-[3px] rounded-full accent-gradient-bg pointer-events-none z-10"
      style={{
        top: playhead.top,
        height: playhead.height,
        opacity: playhead.group === group ? 1 : 0,
        boxShadow: "0 0 12px var(--glow-1)",
      }}
    >
      <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-[7px] h-[7px] rounded-full bg-white shadow" />
    </div>
  );

  const renderItem = (item, index = 0) => {
    const active = view === item.id;
    return (
      <button
        key={item.id}
        ref={(el) => { if (el) itemRefs.current[item.id] = el; }}
        onClick={() => { setView(item.id); setMobileOpen(false); }}
        className={`anim-rise w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition hover:translate-x-1 ${
          active
            ? "accent-gradient-bg text-white shadow-lg anim-glow-pulse"
            : dark
              ? "text-slate-300 hover:bg-white/5"
              : "text-slate-600 hover:bg-slate-900/5"
        }`}
        style={{ "--d": `${index * 50}ms` }}
      >
        {item.icon}
        <span className="flex-1 text-left">{item.label}</span>
        {item.badge != null && (
          <span className={`min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${
            item.badgeTone === "rose"
              ? "bg-rose-500 text-white"
              : active
                ? "bg-white/25 text-white"
                : dark ? "bg-white/10 text-slate-200" : "bg-slate-900/10 text-slate-700"
          }`}>
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  const panel = (
    <div className="flex flex-col h-full">
      {/* profile card */}
      <div className={`glass rounded-3xl p-4 mb-4 anim-rise ${dark ? "" : ""}`} style={{ "--d": "0ms" }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl accent-gradient-bg text-white flex items-center justify-center font-bold text-lg">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>{currentUser?.name}</div>
            <div className={`text-xs truncate ${dark ? "text-slate-400" : "text-slate-500"}`}>{currentUser?.title}</div>
          </div>
        </div>
        <div className={`mt-3 text-[11px] font-mono px-3 py-1.5 rounded-xl inline-block ${dark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
          {currentUser?.role === "admin" ? "ADMIN · FULL ACCESS" : currentUser?.role === "core" ? "CORE TEAM · ELEVATED" : "STAFF · RESTRICTED"}
        </div>
        {/* my XP + level */}
        <button
          onClick={() => setView("leaderboard")}
          className="block w-full text-left mt-3"
          title="Open the leaderboard"
        >
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="accent-text flex items-center gap-1"><Trophy size={11} /> Level {myLevel.level} · {myLevel.name}</span>
            <span className={`font-mono ${dark ? "text-slate-300" : "text-slate-600"}`}>{myXp} XP</span>
          </div>
          <div className={`h-2 rounded-full mt-1.5 overflow-hidden ${dark ? "bg-white/10" : "bg-slate-200"}`}>
            <div className="h-full accent-gradient-bg rounded-full transition-all" style={{ width: `${Math.round(myLevel.progress * 100)}%` }} />
          </div>
          <div className={`text-[10px] font-mono mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {myLevel.nextMin ? `${myLevel.nextMin - myXp} XP to ${myLevel.nextName}` : "Max level reached"}
          </div>
        </button>
      </div>

      <div className={`text-[11px] font-bold uppercase tracking-[.18em] px-4 mb-2 ${dark ? "text-slate-500" : "text-slate-400"}`}>
        Staff Workspace
      </div>
      <nav className="space-y-1 relative">{playheadBar("staff")}{staffItems.map((item, i) => renderItem(item, i))}</nav>

      {adminItems.length > 0 && (
        <>
          <div className={`text-[11px] font-bold uppercase tracking-[.18em] px-4 mt-6 mb-2 flex items-center gap-1.5 ${dark ? "text-slate-500" : "text-slate-400"}`}>
            <ShieldCheck size={12} /> Administration
          </div>
          <nav className="space-y-1 relative">{playheadBar("admin")}{adminItems.map((item, i) => renderItem(item, i))}</nav>
        </>
      )}

      <div className="flex-1" />
      <p className={`text-[11px] px-4 pb-2 ${dark ? "text-slate-600" : "text-slate-400"}`}>
        Signed in as <span className="font-semibold">{currentUser?.name}</span>
      </p>
      <p className={`text-[11px] px-4 pb-2 ${dark ? "text-slate-600" : "text-slate-400"}`}>
        Developed by <span className="font-semibold">Talha Askari</span>
      </p>
    </div>
  );

  return (
    <>
      {/* desktop */}
      <aside className="hidden lg:block w-72 shrink-0">
        <div className="sticky top-24 p-2">{panel}</div>
      </aside>
      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onMouseDown={(e) => { if (e.target === e.currentTarget) setMobileOpen(false); }}>
          <div
            className={`absolute left-0 top-0 bottom-0 w-72 p-4 overflow-y-auto ${dark ? "bg-[#0b0f16]" : "bg-white"} border-r ${dark ? "border-white/10" : "border-slate-200"}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

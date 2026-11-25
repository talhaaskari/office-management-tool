import { useEffect, useMemo, useState } from "react";
import {
  ClipboardList, CalendarDays, MessageSquareHeart, ShieldCheck,
  Users, Megaphone, Inbox, FileBarChart, FileText, Palette, UserCheck,
  Clapperboard, Camera, Film, ChevronRight, MonitorPlay, Palmtree, Trophy,
} from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { useParallax } from "../lib/motion.js";
import { CountUp, Tilt } from "./ui.jsx";
import { isOverdue } from "../lib/dates.js";

/* Role worlds — the same portal, a different studio for each role */
const WORLDS = {
  admin: { name: "Director's Console", title: "Director", tagline: "The whole studio, from your chair." },
  core: { name: "Edit Suite", title: "Editor", tagline: "Where the story comes together." },
  staff: { name: "Shoot Floor", title: "Crew", tagline: "Today's shots, on your call sheet." },
};

const ALL_ZONES = [
  { id: "wall", label: "Studio Wall", desc: "The office TV dashboard", icon: MonitorPlay },
  { id: "tasks", label: "Task Board", desc: "Every studio project", icon: ClipboardList },
  { id: "schedule", label: "My Schedule", desc: "Your week, shot by shot", icon: CalendarDays },
  { id: "leave", label: "Leave", desc: "Chhutti requests", icon: Palmtree },
  { id: "leaderboard", label: "Leaderboard", desc: "XP, levels & badges", icon: Trophy },
  { id: "suggestions", label: "Suggestion Box", desc: "Ideas from the floor", icon: MessageSquareHeart },
  { id: "report", label: "Daily Report", desc: "Wrap up the day", icon: FileText },
  { id: "admin-staff", label: "Staff", desc: "The crew", icon: Users, perm: "manageStaff" },
  { id: "admin-approvals", label: "Approvals", desc: "New members waiting", icon: UserCheck, perm: "manageStaff" },
  { id: "admin-announcements", label: "Announcements", desc: "Studio bulletins", icon: Megaphone, perm: "manageAnnouncements" },
  { id: "admin-suggestions", label: "Suggestions", desc: "Read the floor's ideas", icon: Inbox, perm: "viewSuggestions" },
  { id: "admin-reports", label: "Daily Reports", desc: "Everyone's wrap-ups", icon: FileBarChart, perm: "viewReports" },
  { id: "admin-branding", label: "Branding & Theme", desc: "The studio's look", icon: Palette, perm: "manageStaff" },
];

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* Fake-3D bar: front face + skewed top cap + side strip, grows on mount */
function Bar3D({ value, max, label, color, dark }) {
  const [h, setH] = useState(0);
  const target = max ? Math.max(10, Math.round((value / max) * 108)) : 10;
  useEffect(() => {
    const raf = requestAnimationFrame(() => setH(target));
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative flex items-end" style={{ height: 118 }}>
        <div
          className="relative rounded-t-md transition-[height] duration-700"
          style={{ width: 46, height: h, background: color }}
        >
          <div className="bar3d-top" style={{ background: color }} />
          <div className="bar3d-side" style={{ background: color }} />
        </div>
      </div>
      <div className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>
        <CountUp value={value} />
      </div>
      <div className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-slate-500" : "text-slate-400"}`}>{label}</div>
    </div>
  );
}

/* Personal progress ring (SVG circle, fills on mount) */
function ProgressRing({ value, dark, label }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const [off, setOff] = useState(c);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setOff(c - (c * Math.min(100, Math.max(0, value))) / 100));
    return () => cancelAnimationFrame(raf);
  }, [value, c]);
  return (
    <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
      <svg width={120} height={120} viewBox="0 0 120 120" className="-rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className={dark ? "stroke-white/10" : "stroke-slate-200"} />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off}
          style={{ stroke: "var(--accent-500)", transition: "stroke-dashoffset .9s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>
          <CountUp value={Math.round(value)} suffix="%" />
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${dark ? "text-slate-500" : "text-slate-400"}`}>{label}</span>
      </div>
    </div>
  );
}

/* Cover-flow zone browser: cards fan out in 3D, hovered one comes forward */
function ZoneFlow({ zones, setView, dark, badges }) {
  const [center, setCenter] = useState(0);
  const c = Math.min(center, zones.length - 1);
  return (
    <>
      {/* desktop cover flow */}
      <div className="relative hidden md:block" style={{ perspective: "1200px", height: 250 }}>
        {zones.map((z, i) => {
          const off = i - c;
          const Icon = z.icon;
          const badge = badges[z.id];
          return (
            <button
              key={z.id}
              onMouseEnter={() => setCenter(i)}
              onClick={() => setView(z.id)}
              className={`absolute left-1/2 top-3 w-60 glass rounded-3xl p-5 text-left transition-all duration-500 will-change-transform ${
                off === 0 ? "ring-2 shadow-2xl" : ""
              }`}
              style={{
                transform: `translateX(calc(-50% + ${off * 66}%)) rotateY(${off * -32}deg) translateZ(${Math.abs(off) * -70}px) scale(${1 - Math.abs(off) * 0.08})`,
                zIndex: 20 - Math.abs(off),
                opacity: Math.abs(off) > 2 ? 0 : 1 - Math.abs(off) * 0.28,
                pointerEvents: Math.abs(off) > 2 ? "none" : "auto",
                ["--tw-ring-color"]: "var(--accent-500)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-2xl accent-gradient-bg text-white flex items-center justify-center">
                  <Icon size={20} />
                </div>
                {badge != null && badge > 0 && (
                  <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{z.label}</div>
              <div className={`text-xs mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>{z.desc}</div>
              {off === 0 && (
                <div className="accent-text text-xs font-bold mt-3 flex items-center gap-1">
                  Enter <ChevronRight size={13} />
                </div>
              )}
            </button>
          );
        })}
      </div>
      {/* mobile grid */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {zones.map((z) => {
          const Icon = z.icon;
          const badge = badges[z.id];
          return (
            <Tilt key={z.id}>
              <button
                onClick={() => setView(z.id)}
                className="w-full glass rounded-3xl p-4 text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-2xl accent-gradient-bg text-white flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                  {badge != null && badge > 0 && (
                    <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </div>
                <div className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>{z.label}</div>
                <div className={`text-[11px] mt-0.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>{z.desc}</div>
              </button>
            </Tilt>
          );
        })}
      </div>
    </>
  );
}

/* Week timeline scrubber: 7 days like clips on a timeline, playhead follows */
function WeekScrubber({ tasks, setView, dark }) {
  const todayISO = toISODate(new Date());
  const days = useMemo(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const iso = toISODate(d);
      return {
        d, iso,
        label: d.toLocaleDateString("en-GB", { weekday: "short" }),
        num: d.getDate(),
        full: d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
        count: tasks.filter((t) => t.dueDate === iso).length,
        due: tasks.filter((t) => t.dueDate === iso),
        isToday: iso === todayISO,
      };
    });
  }, [tasks, todayISO]);
  const todayIdx = Math.max(0, days.findIndex((d) => d.isToday));
  const [sel, setSel] = useState(todayIdx);
  const day = days[sel] || days[todayIdx];

  return (
    <div>
      <div className="relative">
        {/* playhead */}
        <div
          className="absolute -top-1 h-[3px] rounded-full accent-gradient-bg transition-all duration-500 z-10"
          style={{ left: `calc(${(sel / 7) * 100}% + 4px)`, width: "calc(14.28% - 8px)" }}
        />
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map((d, i) => (
            <button
              key={d.iso}
              onClick={() => setSel(i)}
              className={`rounded-2xl py-3 px-1 text-center border transition-all duration-300 ${
                i === sel
                  ? "accent-gradient-bg text-white shadow-lg scale-[1.04] border-transparent"
                  : dark
                    ? "border-white/10 text-slate-300 hover:bg-white/5"
                    : "border-slate-200 text-slate-600 hover:bg-slate-900/5"
              }`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{d.label}</div>
              <div className="text-lg font-extrabold leading-tight">{d.num}</div>
              <div className={`text-[10px] font-mono mt-0.5 ${i === sel ? "text-white/80" : d.count > 0 ? "accent-text font-bold" : "opacity-50"}`}>
                {d.count > 0 ? `${d.count} due` : "—"}
              </div>
              {d.isToday && (
                <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${i === sel ? "text-white" : "text-rose-500"}`}>Today</div>
              )}
            </button>
          ))}
        </div>
      </div>
      {/* selected day detail */}
      <div className={`mt-4 flex items-center justify-between gap-3 flex-wrap ${dark ? "text-slate-300" : "text-slate-600"}`}>
        <div className="text-sm min-w-0">
          <span className="font-bold">{day.full}</span>
          <span className="opacity-70"> — </span>
          {day.due.length === 0 ? (
            <span className="opacity-70">no tasks due, clear day.</span>
          ) : (
            <span className="opacity-90">
              {day.due.slice(0, 3).map((t) => t.title).join(" · ")}
              {day.due.length > 3 && ` +${day.due.length - 3} more`}
            </span>
          )}
        </div>
        <button
          onClick={() => setView("schedule")}
          className="accent-text text-sm font-bold flex items-center gap-1 shrink-0 hover:opacity-80"
        >
          Open My Schedule <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default function StudioHome({ setView }) {
  const { currentUser, tasks, pendingApprovals, suggestions, theme, can } = useApp();
  const dark = theme.mode === "dark";
  const world = WORLDS[currentUser?.role] || WORLDS.staff;
  const parallaxRef = useParallax();

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = (currentUser?.name || "there").split(" ")[0];

  const zones = useMemo(
    () => ALL_ZONES.filter((z) => !z.perm || can(z.perm)),
    [can]
  );
  const myTasks = tasks.filter((t) => t.assigneeId === currentUser?.id);
  const myOpen = myTasks.filter((t) => t.status !== "done").length;
  const myDone = myTasks.filter((t) => t.status === "done").length;
  const myAvg = myTasks.length
    ? Math.round(myTasks.reduce((s, t) => s + t.progress, 0) / myTasks.length)
    : 0;
  const statusCounts = {
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "in-progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const maxStatus = Math.max(1, statusCounts.todo, statusCounts.doing, statusCounts.done);
  const overdueCount = tasks.filter(isOverdue).length;
  const pendingCount = pendingApprovals.filter((r) => r.status === "pending").length;
  const openCount = tasks.filter((t) => t.status !== "done").length;

  /* --- hero, personalised per role --- */
  const todayISO = toISODate(new Date());
  const myDueToday = myTasks.filter((t) => t.dueDate === todayISO && t.status !== "done");
  const myNext = [...myTasks]
    .filter((t) => t.status !== "done")
    .sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"))[0];
  const oldestPending = pendingApprovals
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.createdAt - b.createdAt)[0];
  const heroAction =
    currentUser?.role === "admin"
      ? pendingCount > 0
        ? { label: `Review ${pendingCount} approval${pendingCount === 1 ? "" : "s"}`, view: "admin-approvals" }
        : { label: "Open Task Board", view: "tasks" }
      : currentUser?.role === "core"
        ? { label: "Open Task Board", view: "tasks" }
        : { label: "Today's call sheet", view: "schedule" };
  const chipCls = `text-[11px] font-mono px-3 py-1.5 rounded-xl ${dark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`;
  const chipAlertCls = `text-[11px] font-mono px-3 py-1.5 rounded-xl font-bold ${dark ? "bg-rose-500/15 text-rose-300" : "bg-rose-50 text-rose-600"}`;
  const badges = {
    tasks: tasks.filter((t) => t.status !== "done").length,
    schedule: tasks.filter((t) => t.assigneeId === currentUser?.id && isOverdue(t)).length,
    "admin-approvals": pendingCount,
    "admin-suggestions": suggestions.length,
  };

  return (
    <div ref={parallaxRef} className="relative">
      {/* ---------- hero with parallax depth layers ---------- */}
      <div className="relative overflow-hidden rounded-3xl mb-5">
        <div
          className="parallax-layer absolute -right-10 -top-16 w-72 h-72 rounded-full blur-[90px] pointer-events-none"
          style={{ background: "var(--glow-1)", transform: "translate(calc(var(--px, 0) * 18px), calc(var(--py, 0) * 12px))" }}
          aria-hidden="true"
        />
        <div
          className="parallax-layer absolute -left-8 bottom-0 w-56 h-56 rounded-full blur-[80px] pointer-events-none"
          style={{ background: "var(--glow-2)", transform: "translate(calc(var(--px, 0) * -26px), calc(var(--py, 0) * -16px))" }}
          aria-hidden="true"
        />
        <div
          className="parallax-layer absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-[0.07]"
          style={{ transform: "translate(calc(var(--px, 0) * 40px), calc(var(--py, 0) * 24px))" }}
          aria-hidden="true"
        >
          <span className={`text-[7rem] leading-none font-extrabold tracking-tighter ${dark ? "text-white" : "text-slate-900"}`}>
            {world.name.split(" ")[0].toUpperCase()}
          </span>
        </div>
        <div
          className="parallax-layer absolute right-40 bottom-4 pointer-events-none opacity-25 hidden sm:block"
          style={{ transform: "translate(calc(var(--px, 0) * -34px), calc(var(--py, 0) * -20px))" }}
          aria-hidden="true"
        >
          <Clapperboard size={44} className="accent-text" />
        </div>
        <div
          className="parallax-layer absolute right-24 top-5 pointer-events-none opacity-20 hidden sm:block"
          style={{ transform: "translate(calc(var(--px, 0) * 30px), calc(var(--py, 0) * 18px))" }}
          aria-hidden="true"
        >
          <Camera size={34} className="accent-text" />
        </div>
        <div
          className="parallax-layer absolute left-1/2 top-3 pointer-events-none opacity-15 hidden md:block"
          style={{ transform: "translate(calc(var(--px, 0) * -20px), calc(var(--py, 0) * 12px))" }}
          aria-hidden="true"
        >
          <Film size={30} className="accent-text" />
        </div>

        <div className="glass rounded-3xl p-6 sm:p-8 relative">
          <div className="anim-rise" style={{ "--d": "0ms" }}>
            <div className={`text-xs font-bold uppercase tracking-[.2em] ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {greet}, {firstName} — {world.title}
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 ${dark ? "text-white" : "text-slate-900"}`}>
              {world.name}
            </h2>
            <p className={`text-sm mt-2 ${dark ? "text-slate-400" : "text-slate-500"}`}>{world.tagline}</p>
          </div>
          <div className="anim-rise flex items-center gap-2 mt-4 flex-wrap" style={{ "--d": "120ms" }}>
            <span className={`text-[11px] font-mono px-3 py-1.5 rounded-xl ${dark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
              {currentUser?.role === "admin" ? "ADMIN · FULL ACCESS" : currentUser?.role === "core" ? "CORE TEAM · ELEVATED" : "STAFF · RESTRICTED"}
            </span>
            <span className={`text-[11px] font-mono px-3 py-1.5 rounded-xl ${dark ? "bg-white/5 text-slate-300" : "bg-slate-100 text-slate-600"}`}>
              {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>

          {/* role-personalised: live numbers, the one next thing, and a CTA */}
          <div className="anim-rise mt-5 flex items-end justify-between gap-4 flex-wrap" style={{ "--d": "200ms" }}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {currentUser?.role === "admin" ? (
                  <>
                    <span className={pendingCount > 0 ? chipAlertCls : chipCls}>
                      {pendingCount} approval{pendingCount === 1 ? "" : "s"} waiting
                    </span>
                    <span className={overdueCount > 0 ? chipAlertCls : chipCls}>{overdueCount} overdue</span>
                    <span className={chipCls}>{openCount} open tasks</span>
                  </>
                ) : (
                  <>
                    <span className={myDueToday.length > 0 ? chipAlertCls : chipCls}>
                      {myDueToday.length} due today
                    </span>
                    <span className={chipCls}>{myOpen} open</span>
                    <span className={chipCls}>{myAvg}% done</span>
                  </>
                )}
              </div>
              <p className={`text-sm mt-2.5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
                {currentUser?.role === "admin" ? (
                  oldestPending ? (
                    <>Next up: <span className="font-bold">{oldestPending.name}</span> is waiting for approval.</>
                  ) : overdueCount > 0 ? (
                    <><span className="font-bold text-rose-500">{overdueCount} task{overdueCount === 1 ? " is" : "s are"} overdue</span> — oldest first on the board.</>
                  ) : (
                    "All clear — nothing waiting on you."
                  )
                ) : myNext ? (
                  <>Next up: <span className="font-bold">{myNext.title}</span>
                    {myNext.dueDate && (
                      <> — due {new Date(myNext.dueDate + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</>
                    )}
                  </>
                ) : (
                  "Clear slate — nothing on your call sheet."
                )}
              </p>
            </div>
            <button
              onClick={() => setView(heroAction.view)}
              className="btn-shutter btn-shine shrink-0 flex items-center gap-1.5 accent-gradient-bg text-white text-sm font-bold px-5 py-3 rounded-2xl transition hover:opacity-90"
            >
              {heroAction.label} <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ---------- role stats ---------- */}
      <Tilt className="glass rounded-3xl p-6 mb-5 anim-rise" style={{ "--d": "160ms" }}>
        {currentUser?.role === "admin" ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="accent-text" />
              <h3 className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>Studio pulse</h3>
            </div>
            <p className={`text-xs mb-5 ${dark ? "text-slate-500" : "text-slate-400"}`}>
              Every task in the studio, by status{overdueCount > 0 && <> · <span className="text-rose-500 font-bold">{overdueCount} overdue</span></>}
              {pendingCount > 0 && <> · <span className="text-rose-500 font-bold">{pendingCount} approval{pendingCount === 1 ? "" : "s"} waiting</span></>}
            </p>
            <div className="flex items-end justify-around gap-2">
              <Bar3D value={statusCounts.todo} max={maxStatus} label="To do" color="#64748b" dark={dark} />
              <Bar3D value={statusCounts.doing} max={maxStatus} label="In progress" color="#f59e0b" dark={dark} />
              <Bar3D value={statusCounts.done} max={maxStatus} label="Done" color="#10b981" dark={dark} />
              <Bar3D value={overdueCount} max={maxStatus} label="Overdue" color="#f43f5e" dark={dark} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-6 flex-wrap">
            <ProgressRing value={myAvg} dark={dark} label="My progress" />
            <div className="min-w-0">
              <h3 className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>Your slate</h3>
              <p className={`text-sm mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                <span className={`font-extrabold ${dark ? "text-white" : "text-slate-900"}`}><CountUp value={myOpen} /></span> open ·{" "}
                <span className={`font-extrabold ${dark ? "text-white" : "text-slate-900"}`}><CountUp value={myDone} /></span> done
                {myTasks.filter(isOverdue).length > 0 && (
                  <> · <span className="text-rose-500 font-bold">{myTasks.filter(isOverdue).length} overdue</span></>
                )}
              </p>
              <p className={`text-xs mt-2 ${dark ? "text-slate-500" : "text-slate-400"}`}>
                {myOpen === 0
                  ? "Clear slate — nothing on your call sheet."
                  : "Keep rolling — every shot finished is a scene done."}
              </p>
            </div>
          </div>
        )}
      </Tilt>

      {/* ---------- zones cover flow ---------- */}
      <div className="anim-rise mb-5" style={{ "--d": "220ms" }}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <Clapperboard size={16} className="accent-text" />
          <h3 className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>Where to?</h3>
        </div>
        <p className={`text-xs mb-3 px-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
          Hover to browse the rooms — click one to step inside.
        </p>
        <ZoneFlow zones={zones} setView={setView} dark={dark} badges={badges} />
      </div>

      {/* ---------- week timeline scrubber ---------- */}
      <div className="glass rounded-3xl p-5 sm:p-6 anim-rise" style={{ "--d": "280ms" }}>
        <div className="flex items-center gap-2 mb-4">
          <Film size={16} className="accent-text" />
          <h3 className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>This week on the floor</h3>
        </div>
        <WeekScrubber tasks={tasks} setView={setView} dark={dark} />
      </div>
    </div>
  );
}

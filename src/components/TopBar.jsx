import { useEffect, useState } from "react";
import {
  Bell, Sun, Moon, Palette, ChevronDown, CheckCheck, X,
  FileText, LogOut,
} from "lucide-react";
import { BRAND, ACCENTS, ROLE_LABELS } from "../config/brand.js";
import { useApp } from "../store/AppContext.jsx";
import { LogoMark } from "./LoginScreen.jsx";
import { Modal, Field, inputCls, PrimaryButton } from "./ui.jsx";
import { formatDateTime } from "../lib/dates.js";

/* ------------------------- notifications panel ------------------------- */
function NotificationsPanel({ open, onClose }) {
  const { announcements, readMap, currentUser, markAllRead, markAnnouncementRead, theme } = useApp();
  const dark = theme.mode === "dark";

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  const read = readMap[currentUser?.id] || [];
  const sorted = [...announcements].sort((a, b) => b.at - a.at);

  return (
    <div className="fixed inset-0 z-40" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="absolute right-4 top-16 w-80 max-w-[calc(100vw-2rem)] glass rounded-3xl p-4 shadow-2xl"
        style={{ background: dark ? "rgba(13,17,26,.97)" : "rgba(255,255,255,.98)" }}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Notifications"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <h4 className={`font-bold text-sm ${dark ? "text-white" : "text-slate-900"}`}>Notifications</h4>
          <div className="flex items-center gap-1">
            <button
              onClick={markAllRead}
              className="text-xs font-semibold accent-text flex items-center gap-1 px-2 py-1 rounded-lg hover:opacity-80"
            >
              <CheckCheck size={14} /> Mark all read
            </button>
            <button onClick={onClose} aria-label="Close notifications"
              className={`p-1.5 rounded-lg ${dark ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-900/5"}`}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {sorted.length === 0 && (
            <p className={`text-sm text-center py-6 ${dark ? "text-slate-500" : "text-slate-400"}`}>No announcements yet.</p>
          )}
          {sorted.map((a) => {
            const isRead = read.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => markAnnouncementRead(a.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl border transition ${
                  isRead
                    ? dark ? "border-transparent opacity-60" : "border-transparent opacity-60"
                    : dark ? "border-white/10 bg-white/[.03]" : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {!isRead && <span className="w-2 h-2 rounded-full accent-gradient-bg shrink-0" />}
                  <span className={`text-sm font-semibold ${dark ? "text-white" : "text-slate-900"}`}>{a.title}</span>
                </div>
                <p className={`text-xs mt-1 line-clamp-2 ${dark ? "text-slate-400" : "text-slate-500"}`}>{a.body}</p>
                <p className={`text-[11px] mt-1 font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>{formatDateTime(a.at)}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------- daily report modal ------------------------- */
export function DailyReportModal({ open, onClose }) {
  const { addReport, reports, currentUser, theme } = useApp();
  const dark = theme.mode === "dark";
  const [work, setWork] = useState("");
  const [blockers, setBlockers] = useState("");
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState("");
  const todayISO = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(todayISO);
  const minDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const submit = (e) => {
    e.preventDefault();
    setError("");
    if (!work.trim()) return;
    if (reportDate < minDate || reportDate > todayISO) {
      setError("Reports can only be submitted for today or yesterday (48-hour window).");
      return;
    }
    const already = reports.some((r) => r.userId === currentUser?.id && r.date === reportDate);
    if (already) {
      setError("You already submitted a report for this date.");
      return;
    }
    addReport({ work, blockers, date: reportDate });
    setWork(""); setBlockers(""); setReportDate(todayISO);
    setSavedTick(true);
    setTimeout(() => { setSavedTick(false); onClose(); }, 900);
  };

  return (
    <Modal open={open} onClose={onClose} title="Submit Daily Report">
      <form onSubmit={submit}>
        <Field label="Report date">
          <input
            type="date"
            className={inputCls(dark)}
            value={reportDate}
            min={minDate}
            max={todayISO}
            onChange={(e) => setReportDate(e.target.value)}
          />
        </Field>
        <Field label="Today's work">
          <textarea rows={4} className={inputCls(dark)} placeholder="What did you work on today?"
            value={work} onChange={(e) => setWork(e.target.value)} />
        </Field>
        <Field label="Blockers (optional)">
          <textarea rows={2} className={inputCls(dark)} placeholder="Anything blocking you?"
            value={blockers} onChange={(e) => setBlockers(e.target.value)} />
        </Field>
        <PrimaryButton type="submit" className="w-full">
          {savedTick ? "Saved ✓" : "Submit Report"}
        </PrimaryButton>
        {error && (
          <div className="mt-4 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

/* ------------------------- profile menu ------------------------- */
function ProfileMenu({ open, onClose, onReport }) {
  const { currentUser, logout, theme } = useApp();
  const dark = theme.mode === "dark";

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    const onClick = () => onClose();
    window.addEventListener("keydown", onKey);
    // close on any outside click (deferred so the opening click doesn't instantly close)
    const t = setTimeout(() => window.addEventListener("click", onClick), 0);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("click", onClick); clearTimeout(t); };
  }, [open, onClose]);

  if (!open || !currentUser) return null;
  const item = `w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${dark ? "text-slate-200 hover:bg-white/5" : "text-slate-700 hover:bg-slate-900/5"}`;

  return (
    <div
      className="absolute right-0 top-12 w-72 glass rounded-3xl p-3 shadow-2xl z-40"
      style={{ background: dark ? "rgba(13,17,26,.97)" : "rgba(255,255,255,.98)" }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      <div className={`px-4 py-3 rounded-2xl mb-2 ${dark ? "bg-white/[.03]" : "bg-slate-50"}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl accent-gradient-bg text-white flex items-center justify-center font-bold">
            {currentUser.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-bold truncate ${dark ? "text-white" : "text-slate-900"}`}>{currentUser.name}</div>
            <div className={`text-xs truncate ${dark ? "text-slate-400" : "text-slate-500"}`}>{currentUser.title}</div>
            <div className="text-[11px] font-mono accent-text">{ROLE_LABELS[currentUser.role] || "Staff"}</div>
          </div>
        </div>
        <div className={`text-[11px] mt-2 truncate ${dark ? "text-slate-500" : "text-slate-400"}`}>{currentUser.email}</div>
      </div>
      <button className={item} onClick={() => { onClose(); onReport(); }}>
        <FileText size={16} className="accent-text" /> Submit Daily Report
      </button>
      <div className={`my-2 border-t ${dark ? "border-white/10" : "border-slate-100"}`} />
      <button className={`${item} !text-rose-500`} onClick={logout}>
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
}

/* ------------------------- top bar ------------------------- */
/* ON AIR badge — live studio timecode with frames (24fps) and a pulsing REC dot */
function OnAirBadge({ dark }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 50);
    return () => clearInterval(t);
  }, []);
  const tc = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, "0")).join(":");
  const ff = String(Math.floor(now.getMilliseconds() / 1000 * 24)).padStart(2, "0");
  return (
    <span
      className={`hidden md:inline-flex items-center gap-2 text-[11px] font-bold font-mono px-3 py-1.5 rounded-full border ${
        dark ? "border-rose-500/30 bg-rose-500/10 text-rose-400" : "border-rose-500/30 bg-rose-500/10 text-rose-600"
      }`}
      title="Studio is live"
    >
      <span className="w-2 h-2 rounded-full bg-rose-500 anim-rec-dot" />
      ON AIR · {tc}:{ff}
    </span>
  );
}

export default function TopBar({ onGoTasks }) {
  const { currentUser, theme, branding, setMode, setAccent, unreadCount } = useApp();
  const dark = theme.mode === "dark";
  const themeLocked = !!branding?.forceTheme;
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [accentOpen, setAccentOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const iconBtn = `p-2.5 rounded-2xl border transition relative ${
    dark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-900/5 bg-white"
  }`;

  return (
    <>
    <header className={`sticky top-0 z-30 backdrop-blur-xl border-b ${dark ? "bg-[#090b0f]/80 border-white/5" : "bg-white/80 border-slate-200"}`}>
      <div className="flex items-center gap-3 px-4 sm:px-6 h-16">
        <button onClick={onGoTasks} className="flex items-center gap-3 min-w-0">
          <LogoMark size={36} />
          <div className="text-left hidden sm:block">
            <div className={`text-sm font-extrabold uppercase tracking-wide leading-none ${dark ? "text-white" : "text-slate-900"}`}>
              {BRAND.name}
            </div>
            <div className="text-[10px] accent-text font-bold uppercase tracking-[.2em] mt-0.5">{BRAND.tagline}</div>
          </div>
        </button>

        <div className="flex-1" />

        <OnAirBadge dark={dark} />

        {/* accent switcher — hidden when admin forces the theme */}
        {!themeLocked && (
        <div className="relative">
          <button onClick={() => setAccentOpen((o) => !o)} className={iconBtn} aria-label="Workspace color" title="Workspace color">
            <Palette size={18} />
          </button>
          {accentOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setAccentOpen(false)} />
              <div className={`absolute right-0 top-12 z-40 w-44 glass rounded-2xl p-2 shadow-2xl ${dark ? "" : ""}`}
                style={{ background: dark ? "rgba(13,17,26,.97)" : "rgba(255,255,255,.98)" }}>
                {ACCENTS.map((a) => {
                  const dot = {
                    cobalt: "linear-gradient(135deg,#3b82f6,#6366f1)",
                    indigo: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    emerald: "linear-gradient(135deg,#10b981,#0d9488)",
                    rose: "linear-gradient(135deg,#f43f5e,#d946ef)",
                  }[a.id];
                  return (
                    <button
                      key={a.id}
                      onClick={() => { setAccent(a.id); setAccentOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition ${dark ? "hover:bg-white/5 text-slate-200" : "hover:bg-slate-900/5 text-slate-700"}`}
                    >
                      <span className="w-4 h-4 rounded-full" style={{ background: dot }} />
                      {a.label}
                      {theme.accent === a.id && <span className="ml-auto accent-text text-xs font-bold">●</span>}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        )}

        {/* dark/light toggle — hidden when admin forces the theme */}
        {!themeLocked && (
        <button onClick={() => setMode(dark ? "light" : "dark")} className={iconBtn} aria-label="Toggle dark mode" title="Dark / light mode">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        )}
        {themeLocked && branding?.eventName && (
          <span className={`hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full ${dark ? "bg-white/5 text-slate-300" : "bg-slate-900/5 text-slate-600"}`} title="Theme set by administrator">
            🎉 {branding.eventName}
          </span>
        )}

        {/* notifications */}
        <button onClick={() => setNotifOpen((o) => !o)} className={iconBtn} aria-label="Notifications" title="Notifications">
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* profile */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className={`flex items-center gap-2 pl-1 pr-2 py-1 rounded-2xl border transition ${dark ? "border-white/10 hover:bg-white/5" : "border-slate-200 hover:bg-slate-900/5 bg-white"}`}
          >
            <span className="w-9 h-9 rounded-xl accent-gradient-bg text-white flex items-center justify-center font-bold text-sm">
              {currentUser?.name.charAt(0)}
            </span>
            <span className={`text-sm font-semibold hidden md:block max-w-[120px] truncate ${dark ? "text-white" : "text-slate-900"}`}>
              {currentUser?.name.split(" ")[0]}
            </span>
            <ChevronDown size={14} className={dark ? "text-slate-400" : "text-slate-500"} />
          </button>
          <ProfileMenu
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            onReport={() => setReportOpen(true)}
          />
        </div>
      </div>

      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </header>
    {/* modals rendered outside the sticky header so `fixed` positions against the viewport */}
    <DailyReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
}

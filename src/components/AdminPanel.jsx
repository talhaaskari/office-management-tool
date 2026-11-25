import { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Megaphone, Inbox, FileBarChart, ShieldCheck,
  Download, Filter, UserCheck, UserX, Palmtree, Check, X,
} from "lucide-react";
import {
  SUGGESTION_CATEGORIES, ROLES, ROLE_LABELS, ROLE_BLURBS,
  PERMISSION_LABELS, PERMISSIONS, ACCENTS, NAV_LABELS,
} from "../config/brand.js";
import { useApp } from "../store/AppContext.jsx";
import { Modal, Field, inputCls, PrimaryButton, GhostButton, EmptyState } from "./ui.jsx";
import { TaskEditorModal } from "./TasksBoard.jsx";
import { formatDateTime, formatDate } from "../lib/dates.js";
import { downloadReportsPdf } from "../lib/reportPdf.js";

/* ------------------------- section shell ------------------------- */
function Section({ title, sub, action, children }) {
  const { theme } = useApp();
  const dark = theme.mode === "dark";
  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{title}</h2>
          {sub && <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ------------------------- per-member access modal ------------------------- */
function PermToggle({ label, hint, checked, onChange, dark, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-left transition ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      } ${dark ? "border-white/10 bg-white/[.02]" : "border-slate-200 bg-slate-50"}`}
    >
      <span>
        <span className={`block text-sm font-semibold ${dark ? "text-slate-200" : "text-slate-800"}`}>{label}</span>
        {hint && <span className={`block text-[11px] mt-0.5 ${dark ? "text-slate-500" : "text-slate-400"}`}>{hint}</span>}
      </span>
      <span className={`w-11 h-6 rounded-full relative transition shrink-0 ${checked ? "accent-gradient-bg" : dark ? "bg-white/10" : "bg-slate-200"}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

/**
 * Full per-member access control. Starts from the member's role preset;
 * the admin can toggle individual permissions. Saving a set identical to
 * the role preset clears the override (back to "role default").
 */
function AccessModal({ user, onClose }) {
  const { updateUserPermissions, theme } = useApp();
  const dark = theme.mode === "dark";
  const preset = PERMISSIONS[user.role] || PERMISSIONS.staff;
  const [perms, setPerms] = useState(() => ({ ...preset, ...(user.permissions || {}) }));
  const isSelf = false; // StaffAdmin never opens this for the signed-in admin

  const set = (key) => (val) => setPerms((p) => ({ ...p, [key]: val }));

  const save = () => {
    const matchesPreset = Object.keys(preset).every((k) => !!perms[k] === !!preset[k]);
    updateUserPermissions(user.id, matchesPreset ? null : { ...perms });
    onClose();
  };

  const resetToDefault = () => {
    updateUserPermissions(user.id, null);
    onClose();
  };

  const HINTS = {
    manageTasks: "Create, edit, assign & delete tasks",
    manageStaff: "Add/remove members, roles & access",
    manageAnnouncements: "Publish & delete announcements",
    viewSuggestions: "Read the anonymous suggestions inbox",
    viewReports: "Read everyone's daily reports",
  };

  return (
    <Modal open={!!user} onClose={onClose} title={`Access — ${user?.name}`}>
      <p className={`text-xs mb-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
        Role: <span className="font-bold">{ROLE_LABELS[user?.role]}</span>
        {user?.permissions ? <span className="font-semibold accent-text"> · custom access</span> : <span> · role default</span>}
      </p>
      <p className={`text-[11px] mb-4 ${dark ? "text-slate-500" : "text-slate-400"}`}>{ROLE_BLURBS[user?.role]}</p>
      <div className="space-y-2 mb-5">
        {Object.keys(PERMISSION_LABELS).map((key) => (
          <PermToggle
            key={key}
            label={PERMISSION_LABELS[key]}
            hint={HINTS[key]}
            checked={!!perms[key]}
            onChange={set(key)}
            dark={dark}
            disabled={isSelf}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <GhostButton onClick={resetToDefault} className="flex-1">Role default</GhostButton>
        <PrimaryButton onClick={save} className="flex-1">Save Access</PrimaryButton>
      </div>
    </Modal>
  );
}

/* ------------------------- staff admin ------------------------- */
function StaffAdmin() {
  const { users, currentUser, removeUser, updateUserRole, theme } = useApp();
  const dark = theme.mode === "dark";
  const [confirmDel, setConfirmDel] = useState(null);
  const [accessUser, setAccessUser] = useState(null);

  const th = `text-left text-[11px] font-bold uppercase tracking-wider px-4 py-3 ${dark ? "text-slate-500" : "text-slate-400"}`;
  const td = `px-4 py-3 text-sm ${dark ? "text-slate-200" : "text-slate-700"}`;

  return (
    <Section
      title="Staff Management"
      sub={`${users.length} members · everyone signs in with Google — new sign-ins wait in Approvals`}
    >
      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead><tr className={dark ? "bg-white/[.03]" : "bg-slate-50"}>
              <th className={th}>Member</th><th className={th}>Role</th><th className={th}>Email</th><th className={th}>Actions</th>
            </tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-t ${dark ? "border-white/5" : "border-slate-100"}`}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl accent-gradient-bg text-white flex items-center justify-center font-bold text-sm shrink-0">{u.name.charAt(0)}</div>
                      <div>
                        <div className="font-semibold">{u.name} {u.id === currentUser.id && <span className={`text-[10px] font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>(you)</span>}</div>
                        <div className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>{u.title}</div>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <select
                      value={u.role}
                      disabled={u.id === currentUser.id}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                      className={`${inputCls(dark)} !py-1.5 !px-3 !text-xs !w-auto !rounded-xl`}
                      aria-label={`Role for ${u.name}`}
                    >
                      {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                    <div className={`text-[11px] mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
                      {u.permissions ? <span className="font-semibold accent-text">Custom access</span> : ROLE_BLURBS[u.role]}
                    </div>
                  </td>
                  <td className={`${td} font-mono text-xs`}>{u.email}</td>
                  <td className={td}>
                    <div className="flex gap-1">
                      <button
                        onClick={() => u.id !== currentUser.id && setAccessUser(u)}
                        disabled={u.id === currentUser.id}
                        className={`p-2 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed ${dark ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-900/5"}`}
                        title={u.id === currentUser.id ? "You cannot change your own access" : `Control ${u.name}'s access`}
                      >
                        <ShieldCheck size={15} />
                      </button>
                      <button
                        onClick={() => u.id !== currentUser.id && setConfirmDel(u)}
                        disabled={u.id === currentUser.id}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                        title={u.id === currentUser.id ? "You cannot remove yourself" : "Remove member"}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={`grid sm:grid-cols-3 gap-2 mt-4`}>
        {ROLES.map((r) => (
          <div key={r.id} className={`glass rounded-2xl px-4 py-3`}>
            <div className={`text-xs font-bold ${dark ? "text-white" : "text-slate-900"}`}>{r.label}</div>
            <div className={`text-[11px] mt-0.5 leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>{ROLE_BLURBS[r.id]}</div>
          </div>
        ))}
      </div>
      <p className={`text-[11px] mt-3 ${dark ? "text-slate-500" : "text-slate-400"}`}>
        Tap the <ShieldCheck size={11} className="inline -mt-0.5" /> shield on any member for fine-grained access control — toggle individual permissions per person. Changing a role resets custom access to that role's default.
      </p>

      {accessUser && (
        <AccessModal key={accessUser.id} user={accessUser} onClose={() => setAccessUser(null)} />
      )}

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title={`Remove ${confirmDel?.name}?`}>
        <p className={`text-sm mb-5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
          This removes the member from the workspace. Their tasks will become unassigned. They can sign in again later and request approval — or you can add them back from Approvals → Recent decisions.
        </p>
        <div className="flex gap-3">
          <GhostButton onClick={() => setConfirmDel(null)} className="flex-1">Cancel</GhostButton>
          <button
            onClick={() => { removeUser(confirmDel.id); setConfirmDel(null); }}
            className="flex-1 bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl transition"
          >
            Remove
          </button>
        </div>
      </Modal>
    </Section>
  );
}

/* ------------------------- announcements admin ------------------------- */
function AnnouncementsAdmin() {
  const { announcements, users, addAnnouncement, deleteAnnouncement, theme } = useApp();
  const dark = theme.mode === "dark";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    addAnnouncement({ title, body });
    setTitle(""); setBody("");
  };

  return (
    <Section title="Announcements" sub="Published to every staff member's dashboard and notifications">
      <form onSubmit={submit} className="glass rounded-3xl p-5 mb-5">
        <div className="grid sm:grid-cols-[1fr_2fr] gap-3 mb-3">
          <input className={inputCls(dark)} placeholder="Announcement title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className={inputCls(dark)} placeholder="Announcement body…" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <PrimaryButton type="submit" disabled={!title.trim() || !body.trim()} className="flex items-center gap-2">
          <Megaphone size={15} /> Publish Announcement
        </PrimaryButton>
      </form>
      <div className="space-y-2">
        {announcements.length === 0 && <EmptyState icon={<Megaphone size={24} />} title="No announcements" body="Publish the first one above." />}
        {[...announcements].sort((a, b) => b.at - a.at).map((a) => {
          const author = users.find((u) => u.id === a.authorId);
          return (
            <div key={a.id} className="glass rounded-2xl px-4 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>{a.title}</div>
                <div className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>{a.body}</div>
                <div className={`text-[11px] font-mono mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>{author?.name} · {formatDateTime(a.at)}</div>
              </div>
              <button onClick={() => deleteAnnouncement(a.id)} aria-label="Delete announcement"
                className="p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 shrink-0"><Trash2 size={15} /></button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

/* ------------------------- suggestions admin (read-only) ------------------------- */
function SuggestionsAdmin() {
  const { suggestions, theme } = useApp();
  const dark = theme.mode === "dark";
  const catLabel = (id) => SUGGESTION_CATEGORIES.find((c) => c.id === id)?.label || id;
  return (
    <Section title="Anonymous Suggestions" sub={`${suggestions.length} received · submitters are never identified`}>
      {suggestions.length === 0
        ? <EmptyState icon={<Inbox size={24} />} title="No suggestions yet" body="They will appear here when staff submit them." />
        : <div className="space-y-2">
            {[...suggestions].sort((a, b) => b.at - a.at).map((s) => (
              <div key={s.id} className="glass rounded-2xl px-4 py-3">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${dark ? "border-white/10 text-slate-300 bg-white/5" : "border-slate-200 text-slate-600 bg-slate-50"}`}>
                  {catLabel(s.category)}
                </span>
                <p className={`text-sm mt-2 ${dark ? "text-slate-200" : "text-slate-700"}`}>{s.text}</p>
                <p className={`text-[11px] font-mono mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>{formatDateTime(s.at)}</p>
              </div>
            ))}
          </div>}
    </Section>
  );
}

/* ------------------------- leave admin (approve / reject) ------------------------- */
function LeaveAdmin() {
  const { leaveRequests, users, decideLeave, theme } = useApp();
  const dark = theme.mode === "dark";
  const [busy, setBusy] = useState(null);
  const pending = leaveRequests.filter((l) => l.status === "pending").sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const decided = leaveRequests.filter((l) => l.status !== "pending").sort((a, b) => (b.decidedAt || b.createdAt || 0) - (a.decidedAt || a.createdAt || 0));
  const daysBetween = (a, b) => Math.max(1, Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000) + 1);
  const nameOf = (id) => users.find((u) => u.id === id)?.name || "Former member";

  const decide = async (id, status) => {
    setBusy(id);
    await decideLeave(id, status);
    setBusy(null);
  };

  return (
    <Section title="Leave Requests" sub={`${pending.length} waiting · approved leave shows on the ${NAV_LABELS.wall}`}>
      {pending.length === 0 && decided.length === 0 ? (
        <EmptyState icon={<Palmtree size={24} />} title="No leave requests yet" body="They will appear here when staff file them." />
      ) : (
        <>
          {pending.map((l) => (
            <div key={l.id} className="glass rounded-3xl p-5 mb-3">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{nameOf(l.userId)}</div>
                  <div className={`text-sm mt-0.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    {l.type} · {daysBetween(l.startDate, l.endDate)} day{daysBetween(l.startDate, l.endDate) === 1 ? "" : "s"} · {formatDate(l.startDate)} → {formatDate(l.endDate)}
                  </div>
                  {l.reason && <p className={`text-sm mt-2 ${dark ? "text-slate-300" : "text-slate-600"}`}>{l.reason}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => decide(l.id, "approved")} disabled={busy === l.id}
                    className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2.5 rounded-2xl transition"
                  >
                    <Check size={15} /> Approve
                  </button>
                  <button
                    onClick={() => decide(l.id, "rejected")} disabled={busy === l.id}
                    className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-60 text-rose-500 text-sm font-semibold px-4 py-2.5 rounded-2xl transition"
                  >
                    <X size={15} /> Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
          {decided.length > 0 && (
            <>
              <div className={`text-[11px] font-bold uppercase tracking-[.18em] px-1 mt-6 mb-2 ${dark ? "text-slate-500" : "text-slate-400"}`}>Decided</div>
              <div className="space-y-2">
                {decided.slice(0, 10).map((l) => (
                  <div key={l.id} className="glass rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <span className={`text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                      <span className="font-bold">{nameOf(l.userId)}</span> — {l.type} · {formatDate(l.startDate)} → {formatDate(l.endDate)}
                    </span>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${l.status === "approved" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/25" : "bg-rose-500/15 text-rose-500 border-rose-500/25"}`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Section>
  );
}

/* ------------------------- reports admin (read-only) ------------------------- */
function ReportsAdmin() {
  const { reports, users, theme } = useApp();
  const dark = theme.mode === "dark";
  const [memberId, setMemberId] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const filtered = reports.filter((r) => {
    if (memberId !== "all" && r.userId !== memberId) return false;
    if (fromDate && r.date < fromDate) return false;
    if (toDate && r.date > toDate) return false;
    return true;
  }).sort((a, b) => b.at - a.at);

  const handleDownload = () => {
    const person = memberId === "all" ? null : users.find((u) => u.id === memberId);
    downloadReportsPdf(filtered, users, {
      mode: memberId === "all" ? "all" : "person",
      personName: person?.name || "",
      fromDate, toDate,
    });
  };

  const clearFilters = () => { setMemberId("all"); setFromDate(""); setToDate(""); };

  return (
    <Section
      title="Daily Reports"
      sub={`${filtered.length} of ${reports.length} reports`}
      action={
        <PrimaryButton onClick={handleDownload} disabled={filtered.length === 0} className="flex items-center gap-2">
          <Download size={16} /> Download PDF
        </PrimaryButton>
      }
    >
      {/* filters */}
      <div className="glass rounded-2xl px-4 py-3 mb-4 flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-60">
          <Filter size={13} /> Filters
        </div>
        <div className="min-w-[180px] flex-1">
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>Member</label>
          <select className={`${inputCls(dark)} !py-1.5 !text-sm`} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
            <option value="all">All members</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>From</label>
          <input type="date" className={`${inputCls(dark)} !py-1.5 !text-sm`} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div>
          <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>To</label>
          <input type="date" className={`${inputCls(dark)} !py-1.5 !text-sm`} value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
        {(memberId !== "all" || fromDate || toDate) && (
          <button onClick={clearFilters} className={`text-xs font-semibold underline ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0
        ? <EmptyState icon={<FileBarChart size={24} />} title="No reports found" body="Try adjusting the filters." />
        : <div className="space-y-2">
            {filtered.map((r) => {
              const author = users.find((u) => u.id === r.userId);
              return (
                <div key={r.id} className="glass rounded-2xl px-4 py-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${dark ? "text-white" : "text-slate-900"}`}>{author?.name || "Former member"}</span>
                    <span className={`text-[11px] font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>{formatDate(r.date)}</span>
                  </div>
                  <p className={`text-sm mt-2 ${dark ? "text-slate-300" : "text-slate-600"}`}><span className="font-semibold">Work:</span>{" "}{r.work}</p>
                  {r.blockers && <p className={`text-sm mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}><span className="font-semibold">Blockers:</span> {r.blockers}</p>}
                </div>
              );
            })}
          </div>}
    </Section>
  );
}

/* ------------------------- tasks admin (full CRUD) ------------------------- */
function TasksAdmin() {
  const { tasks, deleteTask, theme } = useApp();
  const dark = theme.mode === "dark";
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const th = `text-left text-[11px] font-bold uppercase tracking-wider px-4 py-3 ${dark ? "text-slate-500" : "text-slate-400"}`;
  const td = `px-4 py-3 text-sm ${dark ? "text-slate-200" : "text-slate-700"}`;

  return (
    <Section
      title="Task Management"
      sub={`${tasks.length} tasks · full create / edit / delete`}
      action={<PrimaryButton onClick={() => { setEditing(null); setEditorOpen(true); }} className="flex items-center gap-2"><Plus size={16} /> New Task</PrimaryButton>}
    >
      <div className="glass rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead><tr className={dark ? "bg-white/[.03]" : "bg-slate-50"}>
              <th className={th}>Code</th><th className={th}>Title</th><th className={th}>Project</th><th className={th}>Progress</th><th className={th}>Due</th><th className={th}>Actions</th>
            </tr></thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className={`border-t ${dark ? "border-white/5" : "border-slate-100"}`}>
                  <td className={`${td} font-mono text-xs`}>{t.code}</td>
                  <td className={`${td} font-semibold`}>{t.title}</td>
                  <td className={td}>{t.project}</td>
                  <td className={`${td} font-mono`}>{t.progress}%</td>
                  <td className={td}>{formatDate(t.dueDate)}</td>
                  <td className={td}>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(t); setEditorOpen(true); }} aria-label="Edit"
                        className={`p-1.5 rounded-lg ${dark ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-900/5"}`}><Pencil size={14} /></button>
                      <button onClick={() => deleteTask(t.id)} aria-label="Delete"
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <TaskEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} task={editing} />
    </Section>
  );
}

/* ------------------------- branding & theme (admin) ------------------------- */
function BrandingAdmin() {
  const { branding, updateBranding, uploadLogo, theme } = useApp();
  const dark = theme.mode === "dark";
  const [eventName, setEventName] = useState(branding.eventName || "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // keep the event field in sync when branding changes remotely
  useEffect(() => {
    setEventName(branding.eventName || "");
  }, [branding.eventName]);

  const save = async (patch) => {
    setBusy(true); setError("");
    try {
      const res = await updateBranding(patch);
      if (!res.ok) setError(res.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setBusy(false); }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    if (f.size > 2 * 1024 * 1024) { setError("Logo must be under 2 MB."); return; }
    setBusy(true); setError("");
    try {
      const res = await uploadLogo(f);
      if (!res.ok) setError(res.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
    } finally { setBusy(false); e.target.value = ""; }
  };

  const accentBtn = (a) => (
    <button
      key={a.id}
      type="button"
      onClick={() => save({ themeAccent: a.id })}
      className={`px-4 py-2 rounded-xl text-sm font-semibold border transition ${
        branding.themeAccent === a.id
          ? "border-transparent text-white accent-gradient-bg"
          : dark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {a.label}
    </button>
  );

  return (
    <Section
      title="Branding & Theme"
      sub="Control the workspace logo and theme for everyone — e.g. festive looks for events"
      action={saved && <span className="text-sm font-semibold text-emerald-500">Saved ✓</span>}
    >
      {error && (
        <div className="mb-4 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">{error}</div>
      )}

      {/* logo */}
      <div className="glass rounded-3xl p-6 mb-4">
        <h3 className={`font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>Workspace logo</h3>
        <p className={`text-xs mb-4 ${dark ? "text-slate-400" : "text-slate-500"}`}>
          Shown on the login screen and top bar for everyone. Square images work best.
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className={`w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center font-extrabold text-white text-2xl ${dark ? "bg-white/5" : "bg-slate-100"}`}>
            {branding.logoUrl
              ? <img src={branding.logoUrl} alt="logo" className="w-full h-full object-cover" />
              : <span style={{ background: "var(--accent-gradient)" }} className="w-full h-full flex items-center justify-center">P</span>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <label className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold accent-gradient-bg text-white ${busy ? "opacity-50 pointer-events-none" : ""}`}>
              {busy ? "Uploading…" : "Upload logo"}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} />
            </label>
            {branding.logoUrl && (
              <GhostButton onClick={() => save({ logoUrl: null })}>Remove</GhostButton>
            )}
          </div>
        </div>
      </div>

      {/* theme */}
      <div className="glass rounded-3xl p-6 mb-4">
        <h3 className={`font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>Workspace theme</h3>
        <p className={`text-xs mb-4 ${dark ? "text-slate-400" : "text-slate-500"}`}>
          Pick the look — e.g. a festive accent for Eid, Independence Day, or a launch event.
        </p>
        <div className="flex gap-2 mb-4 flex-wrap">
          {["dark", "light"].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => save({ themeMode: m })}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border capitalize transition ${
                branding.themeMode === m
                  ? "border-transparent text-white accent-gradient-bg"
                  : dark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mb-4 flex-wrap">
          {ACCENTS.map(accentBtn)}
        </div>
        <Field label="Event name (optional)">
          <input
            className={inputCls(dark)}
            placeholder="e.g. Eid ul Fitr, Independence Day…"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            onBlur={() => { if (eventName !== (branding.eventName || "")) save({ eventName }); }}
          />
        </Field>
      </div>

      {/* force */}
      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>Apply to everyone</h3>
            <p className={`text-xs mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
              {branding.forceTheme
                ? "ON — every member sees this theme. Their personal theme choice is paused."
                : "OFF — members see their own theme choice. Turn on to push this look to all devices."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => save({ forceTheme: !branding.forceTheme })}
            className={`w-14 h-7 rounded-full relative transition shrink-0 ${branding.forceTheme ? "accent-gradient-bg" : dark ? "bg-white/10" : "bg-slate-200"}`}
            aria-label="Force theme for everyone"
          >
            <span className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ${branding.forceTheme ? "left-8" : "left-1"}`} />
          </button>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------- approvals (admin) ------------------------- */
function ApprovalCard({ req, linkable }) {
  const { users, approveRequest, rejectRequest, theme } = useApp();
  const dark = theme.mode === "dark";
  const [role, setRole] = useState("staff");
  const [title, setTitle] = useState(req.title || "");
  const [linkTo, setLinkTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const linked = users.find((u) => u.id === linkTo);

  const approve = async () => {
    setBusy(true); setError("");
    const res = await approveRequest(req.id, {
      role: linked ? linked.role : role,
      title: linked ? linked.title : title,
      linkToProfileId: linkTo || null,
    });
    setBusy(false);
    if (!res.ok) setError(res.error);
    else setDone(linked ? `Approved — linked to ${linked.name}, their history moved over.` : "Approved — they can now enter the workspace.");
  };

  const reject = async () => {
    setBusy(true); setError("");
    const res = await rejectRequest(req.id);
    setBusy(false);
    if (!res.ok) setError(res.error);
    else setDone("Rejected.");
  };

  return (
    <div className="glass rounded-3xl p-5">
      <div className="flex items-start gap-4 flex-wrap">
        {req.avatarUrl
          ? <img src={req.avatarUrl} alt="" className="w-11 h-11 rounded-2xl object-cover shrink-0" />
          : <div className="w-11 h-11 rounded-2xl accent-gradient-bg text-white flex items-center justify-center font-bold text-lg shrink-0">{req.name.charAt(0)}</div>}
        <div className="flex-1 min-w-[200px]">
          <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{req.name}</div>
          <div className={`text-xs font-mono mt-0.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>{req.email}</div>
          {(req.title || req.phone) && (
            <div className={`text-xs mt-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>
              {req.title && <span className="font-semibold">{req.title}</span>}
              {req.title && req.phone && <span className={`mx-1.5 ${dark ? "text-slate-500" : "text-slate-400"}`}>·</span>}
              {req.phone && <span className="font-mono">{req.phone}</span>}
            </div>
          )}
          <div className={`text-[11px] mt-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>Requested {formatDateTime(req.createdAt)}</div>
        </div>
      </div>

      {done ? (
        <div className={`mt-4 text-sm font-medium px-4 py-3 rounded-2xl text-center ${dark ? "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          {done}
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3 mt-4">
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>Role</label>
              <select className={`${inputCls(dark)} !py-2 !text-sm`} value={linked ? linked.role : role} disabled={!!linked} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>Job title</label>
              <input className={`${inputCls(dark)} !py-2 !text-sm`} value={linked ? linked.title : title} disabled={!!linked} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Video Editor" />
            </div>
            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>Link to existing member</label>
              <select className={`${inputCls(dark)} !py-2 !text-sm`} value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
                <option value="">New member (no link)</option>
                {linkable.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.email}</option>)}
              </select>
            </div>
          </div>
          {linked && (
            <p className={`text-xs mt-2 ${dark ? "text-amber-300/90" : "text-amber-700"}`}>
              Linking to {linked.name}: their tasks, reports and history move to this Google account, and the old {linked.email} profile is replaced.
            </p>
          )}
          {error && (
            <div className="mt-3 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">{error}</div>
          )}
          <div className="flex gap-3 mt-4">
            <button
              onClick={approve} disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-semibold px-5 py-3 rounded-2xl transition"
            >
              <UserCheck size={16} /> {busy ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={reject} disabled={busy}
              className="flex-1 flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 disabled:opacity-60 text-rose-500 text-sm font-semibold px-5 py-3 rounded-2xl transition"
            >
              <UserX size={16} /> Reject
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ApprovalsAdmin() {
  const { pendingApprovals, users, approveRequest, theme } = useApp();
  const dark = theme.mode === "dark";
  const [reapproving, setReapproving] = useState(null);
  const pending = pendingApprovals.filter((r) => r.status === "pending");
  const decided = pendingApprovals.filter((r) => r.status !== "pending");
  // members with old internal emails are the link candidates
  const linkable = users.filter((u) => u.email.endsWith("@peacestaff.internal"));

  return (
    <Section
      title="Approvals"
      sub={`${pending.length} waiting · new Google sign-ins appear here until you approve them`}
    >
      {pending.length === 0 ? (
        <EmptyState icon={<UserCheck size={24} />} title="No pending requests" body="When someone signs in with Google for the first time, their request will show up here." />
      ) : (
        <div className="space-y-3">
          {pending.map((r) => <ApprovalCard key={r.id} req={r} linkable={linkable} />)}
        </div>
      )}

      {decided.length > 0 && (
        <>
          <h3 className={`text-sm font-bold uppercase tracking-wider mt-8 mb-3 ${dark ? "text-slate-400" : "text-slate-500"}`}>
            Recent decisions
          </h3>
          <div className="space-y-2">
            {decided.slice(0, 10).map((r) => (
              <div key={r.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  r.status === "approved"
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-rose-500/10 text-rose-500"
                }`}>
                  {r.status === "approved" ? "Approved" : "Rejected"}
                </span>
                <div className="flex-1 min-w-[180px]">
                  <span className={`text-sm font-semibold ${dark ? "text-slate-200" : "text-slate-800"}`}>{r.name}</span>
                  <span className={`text-xs font-mono ml-2 ${dark ? "text-slate-500" : "text-slate-400"}`}>{r.email}</span>
                </div>
                <span className={`text-[11px] font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>
                  {r.decidedAt ? formatDateTime(r.decidedAt) : ""}
                </span>
                {r.status === "rejected" && (
                  <button
                    onClick={async () => {
                      setReapproving(r.id);
                      await approveRequest(r.id, { role: "staff", title: "", linkToProfileId: null });
                      setReapproving(null);
                    }}
                    disabled={reapproving === r.id}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    {reapproving === r.id ? "Approving…" : "Approve anyway"}
                  </button>
                )}
                {r.status === "approved" && !users.some((u) => u.id === r.authUserId) && (
                  <button
                    onClick={async () => {
                      setReapproving(r.id);
                      await approveRequest(r.id, { role: "staff", title: "", linkToProfileId: null });
                      setReapproving(null);
                    }}
                    disabled={reapproving === r.id}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    {reapproving === r.id ? "Adding…" : "Add again"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  );
}

/* ------------------------- router ------------------------- */
const VIEW_PERMS = {
  "admin-tasks": "manageTasks",
  "admin-staff": "manageStaff",
  "admin-approvals": "manageStaff",
  "admin-announcements": "manageAnnouncements",
  "admin-suggestions": "viewSuggestions",
  "admin-reports": "viewReports",
  "admin-leave": "manageStaff",
  "admin-branding": "manageStaff",
};

export default function AdminPanel({ view }) {
  const { can, theme } = useApp();
  const dark = theme.mode === "dark";
  const perm = VIEW_PERMS[view];
  if (!perm || !can(perm)) {
    return (
      <Section title="Restricted" sub="This section isn't part of your access">
        <EmptyState
          icon={<ShieldCheck size={24} />}
          title="Access restricted"
          body="Your role doesn't include this section. Ask your administrator to update your access."
        />
      </Section>
    );
  }
  switch (view) {
    case "admin-tasks": return <TasksAdmin />;
    case "admin-staff": return <StaffAdmin />;
    case "admin-approvals": return <ApprovalsAdmin />;
    case "admin-announcements": return <AnnouncementsAdmin />;
    case "admin-suggestions": return <SuggestionsAdmin />;
    case "admin-reports": return <ReportsAdmin />;
    case "admin-leave": return <LeaveAdmin />;
    case "admin-branding": return <BrandingAdmin />;
    default: return null;
  }
}

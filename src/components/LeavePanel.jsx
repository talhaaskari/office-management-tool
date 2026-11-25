import { useMemo, useState } from "react";
import { Palmtree, X } from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { Field, inputCls, PrimaryButton, GhostButton, EmptyState } from "./ui.jsx";
import { formatDate } from "../lib/dates.js";

/* My Leave — file a chhutti request, track its status, cancel while pending. */

const TYPES = [
  { id: "annual", label: "Annual leave" },
  { id: "sick", label: "Sick leave" },
  { id: "casual", label: "Casual leave" },
  { id: "emergency", label: "Emergency" },
];

const STATUS_STYLE = {
  pending: "bg-amber-400/15 text-amber-500 border-amber-400/25",
  approved: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
  rejected: "bg-rose-500/15 text-rose-500 border-rose-500/25",
};

function daysBetween(a, b) {
  const ms = new Date(b + "T12:00:00") - new Date(a + "T12:00:00");
  return Math.max(1, Math.round(ms / 86400000) + 1);
}

export default function LeavePanel() {
  const { currentUser, leaveRequests, requestLeave, cancelLeave, theme } = useApp();
  const dark = theme.mode === "dark";
  const [type, setType] = useState("annual");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const mine = useMemo(
    () => leaveRequests.filter((l) => l.userId === currentUser?.id).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [leaveRequests, currentUser]
  );

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!start || !end) { setError("Pick a start and end date."); return; }
    if (end < start) { setError("End date can't be before the start date."); return; }
    const overlap = mine.some(
      (l) => l.status !== "rejected" && l.startDate <= end && l.endDate >= start
    );
    if (overlap) { setError("This overlaps a leave request you already have."); return; }
    setBusy(true);
    try {
      const res = await requestLeave({ type, startDate: start, endDate: end, reason });
      if (!res.ok) setError(res.error || "Couldn't send the request — the admin may need to run leave-requests.sql first.");
      else { setStart(""); setEnd(""); setReason(""); }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Palmtree size={18} className="accent-text" />
        <h2 className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>My Leave</h2>
      </div>
      <p className={`text-sm mb-5 ${dark ? "text-slate-400" : "text-slate-500"}`}>
        File a chhutti request — the admin approves it, and approved leave shows on the Studio Wall.
      </p>

      <form onSubmit={submit} className="glass rounded-3xl p-6 mb-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Type">
            <select className={inputCls(dark)} value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="From">
            <input type="date" className={inputCls(dark)} value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="To">
            <input type="date" className={inputCls(dark)} value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Reason (optional)">
          <textarea className={`${inputCls(dark)} resize-none`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family wedding in Lahore" />
        </Field>
        {start && end && end >= start && (
          <p className={`text-xs mb-3 ${dark ? "text-slate-400" : "text-slate-500"}`}>
            That's <span className="font-bold">{daysBetween(start, end)} day{daysBetween(start, end) === 1 ? "" : "s"}</span>.
          </p>
        )}
        {error && (
          <div className="mb-4 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">{error}</div>
        )}
        <PrimaryButton type="submit" disabled={busy}>{busy ? "Sending…" : "Send leave request"}</PrimaryButton>
      </form>

      {mine.length === 0 ? (
        <EmptyState
          icon={<Palmtree size={24} />}
          title="No leave requests yet"
          body="Your requests and their status will show up here."
        />
      ) : (
        <div className="space-y-3">
          {mine.map((l) => (
            <div key={l.id} className="glass rounded-3xl p-5 flex items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>
                  {TYPES.find((t) => t.id === l.type)?.label || l.type} · {daysBetween(l.startDate, l.endDate)} day{daysBetween(l.startDate, l.endDate) === 1 ? "" : "s"}
                </div>
                <div className={`text-sm mt-0.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  {formatDate(l.startDate)} → {formatDate(l.endDate)}
                </div>
                {l.reason && <p className={`text-sm mt-2 ${dark ? "text-slate-300" : "text-slate-600"}`}>{l.reason}</p>}
                <div className={`text-[11px] mt-2 ${dark ? "text-slate-500" : "text-slate-400"}`}>Requested {formatDate(new Date(l.createdAt).toISOString().slice(0, 10))}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLE[l.status] || STATUS_STYLE.pending}`}>
                  {l.status}
                </span>
                {l.status === "pending" && (
                  <button
                    onClick={async () => { setCancelling(l.id); await cancelLeave(l.id); setCancelling(null); }}
                    disabled={cancelling === l.id}
                    className="text-xs font-bold text-rose-500 hover:opacity-80 flex items-center gap-1 disabled:opacity-50"
                  >
                    <X size={12} /> {cancelling === l.id ? "Cancelling…" : "Cancel request"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

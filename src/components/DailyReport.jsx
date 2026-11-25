import { useState } from "react";
import { FileText, Send, History } from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { Field, inputCls, PrimaryButton, EmptyState } from "./ui.jsx";
import { formatDate } from "../lib/dates.js";

/**
 * Daily Report — visible to EVERYONE (staff + admin).
 * Submit today's work report + see your own submission history.
 * Admins see every staff member's reports under Administration → Daily Reports.
 */
export default function DailyReport() {
  const { addReport, reports, currentUser, theme } = useApp();
  const dark = theme.mode === "dark";
  const [work, setWork] = useState("");
  const [blockers, setBlockers] = useState("");
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState("");
  const todayISO = new Date().toISOString().slice(0, 10);
  const [reportDate, setReportDate] = useState(todayISO);

  const mine = reports
    .filter((r) => r.userId === currentUser?.id)
    .sort((a, b) => b.at - a.at);

  // 48-hour window: today or yesterday only
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
    const already = mine.some((r) => r.date === reportDate);
    if (already) {
      setError(`You already submitted a report for ${formatDate(reportDate)}.`);
      return;
    }
    addReport({ work, blockers, date: reportDate });
    setWork("");
    setBlockers("");
    setReportDate(todayISO);
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 2500);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-5">
        <h2 className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>
          Daily Report
        </h2>
        <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
          Submit today's work — visible to studio leadership.
        </p>
      </div>

      <div className="glass rounded-3xl p-6 sm:p-8 mb-6">
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
          <p className={`text-[11px] -mt-2 mb-4 ${dark ? "text-slate-500" : "text-slate-400"}`}>
            You can submit for today or yesterday only (48-hour window).
          </p>
          <Field label="Today's work *">
            <textarea
              rows={4}
              className={inputCls(dark)}
              placeholder="What did you work on today?"
              value={work}
              onChange={(e) => setWork(e.target.value)}
            />
          </Field>
          <Field label="Blockers (optional)">
            <textarea
              rows={2}
              className={inputCls(dark)}
              placeholder="Anything blocking you?"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
            />
          </Field>
          <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2">
            {savedTick ? (
              <>Saved ✓</>
            ) : (
              <><Send size={16} /> Submit Report</>
            )}
          </PrimaryButton>
          {error && (
            <div className="mt-4 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {error}
            </div>
          )}
        </form>
      </div>

      <div className={`flex items-center gap-2 mb-3 px-1 ${dark ? "text-slate-300" : "text-slate-700"}`}>
        <History size={16} />
        <h3 className="font-bold text-sm">My submitted reports ({mine.length})</h3>
      </div>
      {mine.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="No reports yet"
          body="Your submitted daily reports will appear here."
        />
      ) : (
        <div className="space-y-2">
          {mine.map((r) => (
            <div key={r.id} className="glass rounded-2xl px-4 py-3">
              <div className={`text-[11px] font-mono mb-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
                {formatDate(r.date)}
              </div>
              <p className={`text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                <span className="font-semibold">Work:</span>{" "}{r.work}
              </p>
              {r.blockers && (
                <p className={`text-sm mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  <span className="font-semibold">Blockers:</span> {r.blockers}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

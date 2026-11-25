import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Megaphone } from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { formatDateTime } from "../lib/dates.js";

/** Dismissible announcement carousel (prev / next / close). */
export default function AnnouncementCarousel() {
  const { announcements, users, theme, markAnnouncementRead } = useApp();
  const dark = theme.mode === "dark";
  const [idx, setIdx] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const sorted = [...announcements].sort((a, b) => b.at - a.at);
  if (dismissed || sorted.length === 0) return null;

  const safeIdx = Math.min(idx, sorted.length - 1);
  const a = sorted[safeIdx];
  const author = users.find((u) => u.id === a.authorId);

  const go = (d) => {
    const n = (safeIdx + d + sorted.length) % sorted.length;
    setIdx(n);
    markAnnouncementRead(sorted[n].id);
  };

  return (
    <div className={`glass rounded-3xl p-5 mb-6 relative overflow-hidden ${dark ? "" : ""}`}>
      <div className="absolute top-0 left-0 right-0 h-1 accent-gradient-bg opacity-70" />
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-2xl accent-gradient-bg text-white flex items-center justify-center shrink-0">
          <Megaphone size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{a.title}</h3>
            <span className={`text-[11px] font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>
              {author?.name} · {formatDateTime(a.at)}
            </span>
          </div>
          <p className={`text-sm mt-1 ${dark ? "text-slate-300" : "text-slate-600"}`}>{a.body}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss announcements"
          className={`p-2 rounded-xl shrink-0 ${dark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-900/5"}`}
        >
          <X size={16} />
        </button>
      </div>
      {sorted.length > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className={`text-xs font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {safeIdx + 1} / {sorted.length}
          </div>
          <div className="flex gap-2">
            <button onClick={() => go(-1)} aria-label="Previous announcement"
              className={`p-2 rounded-xl border transition ${dark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-900/5"}`}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => go(1)} aria-label="Next announcement"
              className={`p-2 rounded-xl border transition ${dark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-900/5"}`}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

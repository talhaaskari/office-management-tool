import { useMemo } from "react";
import { Trophy, Target, Crosshair, Zap, FileText, Flame, Sunrise, Crown } from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { BADGES, userStats } from "../lib/gamification.js";
import { EmptyState } from "./ui.jsx";

/* Leaderboard — XP, levels, badges, and Crew of the Month. */

const BADGE_ICONS = {
  target: Target,
  crosshair: Crosshair,
  zap: Zap,
  "file-text": FileText,
  flame: Flame,
  sunrise: Sunrise,
};

function BadgeChip({ badge, earned, dark }) {
  const Icon = BADGE_ICONS[badge.icon] || Trophy;
  return (
    <span
      title={`${badge.name} — ${badge.desc}${earned ? "" : " (not earned yet)"}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
        earned
          ? "bg-amber-400/15 text-amber-500 border-amber-400/25"
          : dark
            ? "bg-white/5 text-slate-500 border-white/10 opacity-60"
            : "bg-slate-100 text-slate-400 border-slate-200 opacity-70"
      }`}
    >
      <Icon size={12} /> {badge.name}
    </span>
  );
}

export default function Leaderboard() {
  const { users, tasks, reports, xpEvents, theme, currentUser } = useApp();
  const dark = theme.mode === "dark";
  const isStaff = currentUser?.role === "staff"; // staff sees ONLY their own stats — never anyone else's

  const ranked = useMemo(() => {
    return users
      .map((u) => ({ user: u, stats: userStats({ userId: u.id, xpEvents, tasks, reports }) }))
      .sort((a, b) => b.stats.xp - a.stats.xp || b.stats.done - a.stats.done);
  }, [users, xpEvents, tasks, reports]);

  const crewOfMonth = useMemo(() => {
    let best = null;
    let bestXp = 0;
    ranked.forEach(({ user, stats }) => {
      if (stats.monthXp > bestXp) { best = user; bestXp = stats.monthXp; }
    });
    return best && bestXp > 0 ? { user: best, xp: bestXp } : null;
  }, [ranked]);

  const top = ranked.slice(0, 3);
  const hasXp = ranked.some((r) => r.stats.xp > 0);
  const mine = ranked.find((r) => r.user.id === currentUser?.id);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={18} className="accent-text" />
        <h2 className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>Leaderboard</h2>
      </div>
      <p className={`text-sm mb-5 ${dark ? "text-slate-400" : "text-slate-500"}`}>
        Task done +20 XP · early finish +10 · daily report +15. Badges for streaks, reports and more.
      </p>

      {/* Staff: only their own stats — no podium, no crew of the month, no other members */}
      {isStaff ? (
        mine ? (
          <div>
            <div className="glass rounded-3xl p-6 mb-5">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-14 h-14 rounded-3xl accent-gradient-bg text-white flex items-center justify-center font-bold text-2xl shrink-0">
                  {mine.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-[140px]">
                  <div className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{mine.user.name}</div>
                  <div className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    {mine.user.title} · Level {mine.stats.level.level} {mine.stats.level.name}
                  </div>
                  <div className={`h-2.5 rounded-full mt-2 overflow-hidden max-w-[280px] ${dark ? "bg-white/10" : "bg-slate-200"}`}>
                    <div className="h-full accent-gradient-bg rounded-full transition-all" style={{ width: `${Math.round(mine.stats.level.progress * 100)}%` }} />
                  </div>
                  <div className={`text-xs font-mono mt-1.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    {mine.stats.level.nextMin ? `${mine.stats.level.nextMin - mine.stats.xp} XP to ${mine.stats.level.nextName}` : "Max level reached"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-3xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{mine.stats.xp} <span className="text-sm font-bold opacity-60">XP</span></div>
                  <div className={`text-xs font-mono mt-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                    {mine.stats.done} done · {mine.stats.reportCount} reports · {mine.stats.streak}d streak
                  </div>
                  <div className={`text-xs font-mono ${dark ? "text-slate-400" : "text-slate-500"}`}>{mine.stats.monthXp} XP this month</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {BADGES.map((b) => (
                  <BadgeChip key={b.id} badge={b} earned={mine.stats.badges.includes(b.id)} dark={dark} />
                ))}
              </div>
            </div>
            <p className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
              The full team board is visible to Admin and Core Team only.
            </p>
          </div>
        ) : (
          <EmptyState
            icon={<Trophy size={24} />}
            title="No stats yet"
            body="Complete a task or submit a daily report to earn your first XP."
          />
        )
      ) : (
        <>
          {crewOfMonth && (
        <div className="glass rounded-3xl p-6 mb-5 relative overflow-hidden">
          <div className="absolute -right-8 -top-12 w-56 h-56 rounded-full blur-[70px] pointer-events-none" style={{ background: "var(--glow-1)" }} aria-hidden="true" />
          <div className="relative flex items-center gap-4 flex-wrap">
            <span className="w-14 h-14 rounded-3xl accent-gradient-bg text-white flex items-center justify-center shadow-lg">
              <Crown size={26} />
            </span>
            <div>
              <div className={`text-xs font-bold uppercase tracking-[.2em] ${dark ? "text-slate-400" : "text-slate-500"}`}>Crew of the Month</div>
              <div className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{crewOfMonth.user.name}</div>
              <div className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>{crewOfMonth.xp} XP earned this month</div>
            </div>
          </div>
        </div>
      )}

      {!hasXp ? (
        <EmptyState
          icon={<Trophy size={24} />}
          title="No XP on the board yet"
          body="Complete a task or submit a daily report to earn your first XP."
        />
      ) : (
        <>
          {/* podium */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {top.map((r, i) => (
              <div
                key={r.user.id}
                className={`glass rounded-3xl p-4 text-center ${i === 0 ? "ring-2 shadow-xl" : ""}`}
                style={i === 0 ? { ["--tw-ring-color"]: "var(--accent-500)" } : undefined}
              >
                <div className={`text-2xl font-extrabold ${i === 0 ? "accent-text" : dark ? "text-slate-500" : "text-slate-400"}`}>
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                </div>
                <div className="w-11 h-11 mx-auto mt-2 rounded-2xl accent-gradient-bg text-white flex items-center justify-center font-bold text-lg">
                  {r.user.name.charAt(0)}
                </div>
                <div className={`font-bold text-sm mt-2 truncate ${dark ? "text-white" : "text-slate-900"}`}>{r.user.name}</div>
                <div className={`text-xs font-mono mt-0.5 ${dark ? "text-slate-400" : "text-slate-500"}`}>
                  Lv {r.stats.level.level} · {r.stats.xp} XP
                </div>
              </div>
            ))}
          </div>

          {/* full ranking */}
          <div className="space-y-3">
            {ranked.map((r, i) => (
              <div key={r.user.id} className="glass rounded-3xl p-5">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className={`w-8 text-center text-lg font-extrabold ${dark ? "text-slate-400" : "text-slate-500"}`}>#{i + 1}</span>
                  <div className="w-11 h-11 rounded-2xl accent-gradient-bg text-white flex items-center justify-center font-bold text-lg shrink-0">
                    {r.user.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className={`font-bold ${dark ? "text-white" : "text-slate-900"}`}>{r.user.name}</div>
                    <div className={`text-xs ${dark ? "text-slate-400" : "text-slate-500"}`}>
                      {r.user.title} · Level {r.stats.level.level} {r.stats.level.name}
                    </div>
                    <div className={`h-2 rounded-full mt-2 overflow-hidden max-w-[220px] ${dark ? "bg-white/10" : "bg-slate-200"}`}>
                      <div className="h-full accent-gradient-bg rounded-full transition-all" style={{ width: `${Math.round(r.stats.level.progress * 100)}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>{r.stats.xp} <span className="text-xs font-bold opacity-60">XP</span></div>
                    <div className={`text-xs font-mono ${dark ? "text-slate-400" : "text-slate-500"}`}>
                      {r.stats.done} done · {r.stats.reportCount} reports · {r.stats.streak}d streak
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {BADGES.map((b) => (
                    <BadgeChip key={b.id} badge={b} earned={r.stats.badges.includes(b.id)} dark={dark} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { isOverdue } from "../lib/dates.js";
import { MASCOT, NAV_LABELS } from "../config/brand.js";

/* Clappy — the studio's clapperboard buddy. Lives bottom-right, reacts to
 * what happens in the portal: jumps with joy when you finish a task or
 * level up, looks worried when shots go overdue, and hands out tips when
 * you click him. */

const TIPS = [
  "Tip: drag a task card to flip it — notes live on the back.",
  `Tip: the ${NAV_LABELS.wall} is made for the office TV — hit Present.`,
  "Tip: finishing a task before its due date pays +10 bonus XP.",
  "Tip: a daily report is worth +15 XP. Wrap up the day!",
  "Tip: 3 days in a row earns the Hot Streak badge.",
  "Tip: stuck? Drop it in the Suggestion Box — anonymously.",
  "Tip: the Delete button runs away for a reason. Chase it only if you mean it.",
];

function Face({ mood }) {
  if (mood === "happy" || mood === "celebrate") {
    return (
      <g stroke="white" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M24 52 Q30 44 36 52" />
        <path d="M48 52 Q54 44 60 52" />
        <path d="M31 64 Q42 74 53 64" />
      </g>
    );
  }
  if (mood === "worried") {
    return (
      <g>
        <g stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M23 42 L35 45" />
          <path d="M61 42 L49 45" />
        </g>
        <g className="anim-mascot-blink">
          <circle cx="30" cy="54" r="7" fill="white" />
          <circle cx="54" cy="54" r="7" fill="white" />
          <circle cx="30" cy="55" r="3.2" fill="#0f172a" />
          <circle cx="54" cy="55" r="3.2" fill="#0f172a" />
        </g>
        <path d="M34 70 Q42 67 50 70" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>
    );
  }
  return (
    <g>
      <g className="anim-mascot-blink">
        <circle cx="30" cy="54" r="7" fill="white" />
        <circle cx="54" cy="54" r="7" fill="white" />
        <circle cx="30" cy="55" r="3.2" fill="#0f172a" />
        <circle cx="54" cy="55" r="3.2" fill="#0f172a" />
      </g>
      <path d="M31 66 Q42 75 53 66" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" />
    </g>
  );
}

export default function Mascot() {
  const { currentUser, tasks, mascot, triggerMascot, theme } = useApp();
  const dark = theme.mode === "dark";
  const [bubble, setBubble] = useState("");
  const [burst, setBurst] = useState(0);
  const firstName = (currentUser?.name || "there").split(" ")[0];

  const myTasks = tasks.filter((t) => t.assigneeId === currentUser?.id);
  const myOverdue = myTasks.filter(isOverdue).length;
  const myDueToday = myTasks.filter((t) => {
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return t.dueDate === today && t.status !== "done";
  }).length;

  const defaultMessage = useMemo(() => {
    if (myOverdue > 0) return `You've got ${myOverdue} overdue shot${myOverdue === 1 ? "" : "s"} — let's clear them!`;
    if (myDueToday > 0) return `${myDueToday} shot${myDueToday === 1 ? "" : "s"} on today's call sheet — roll camera!`;
    return "All clear! Click me for a studio tip.";
  }, [myOverdue, myDueToday]);

  const mood = myOverdue > 0 && mascot.mood === "idle" ? "worried" : mascot.mood;

  // welcome bubble on mount, event bubbles on trigger
  useEffect(() => {
    setBubble(`Welcome back, ${firstName}!`);
    const t = setTimeout(() => setBubble(""), 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!mascot.key) return;
    setBurst((b) => b + 1);
    if (mascot.message) setBubble(mascot.message);
    const t = setTimeout(() => setBubble(""), 6000);
    return () => clearTimeout(t);
  }, [mascot.key, mascot.message]);

  const onClick = () => {
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
    triggerMascot("happy", tip);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2 select-none" role="img" aria-label={`${MASCOT.name}, the studio mascot`}>
      {bubble && (
        <div className="anim-pop relative max-w-[240px] glass rounded-2xl rounded-br-sm px-4 py-3 text-sm font-medium shadow-xl" style={{ background: dark ? "rgba(13,17,26,.95)" : "rgba(255,255,255,.97)" }}>
          <span className={dark ? "text-slate-200" : "text-slate-700"}>{bubble}</span>
          <button
            onClick={() => setBubble("")}
            aria-label="Hide message"
            className={`absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center shadow ${dark ? "bg-white/10 text-slate-300" : "bg-white text-slate-500 border border-slate-200"}`}
          >
            <X size={11} />
          </button>
        </div>
      )}
      <button
        onClick={onClick}
        aria-label={`${MASCOT.name} the mascot — click for a tip`}
        className="cursor-pointer outline-none"
        title={`${MASCOT.name} — click me!`}
      >
        <div key={burst} className={mood === "happy" || mood === "celebrate" ? "anim-mascot-jump" : mood === "worried" ? "anim-mascot-wiggle" : "anim-mascot-bob"}>
          <svg width="84" height="92" viewBox="0 0 84 92" className="drop-shadow-xl">
            <defs>
              <clipPath id="clappy-slate">
                <rect x="10" y="8" width="64" height="16" rx="4" />
              </clipPath>
            </defs>
            {/* clapper top */}
            <g transform="rotate(-6 42 16)">
              <rect x="10" y="8" width="64" height="16" rx="4" fill="var(--accent-500)" />
              <g clipPath="url(#clappy-slate)" fill="white" opacity="0.9">
                <rect x="18" y="2" width="7" height="28" transform="rotate(24 21 16)" />
                <rect x="36" y="2" width="7" height="28" transform="rotate(24 39 16)" />
                <rect x="54" y="2" width="7" height="28" transform="rotate(24 57 16)" />
              </g>
            </g>
            {/* body */}
            <rect x="10" y="28" width="64" height="56" rx="10" fill="#1e293b" stroke="rgba(255,255,255,.16)" />
            <rect x="10" y="28" width="64" height="10" rx="5" fill="rgba(255,255,255,.07)" />
            <Face mood={mood} />
          </svg>
        </div>
      </button>
      <div className={`text-[10px] font-mono font-bold uppercase tracking-[.2em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
        {MASCOT.name}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { useApp } from "../store/AppContext.jsx";
import { useMagnetic, useTilt } from "../lib/motion.js";

/** 3D tilt wrapper: the card follows the cursor in 3D. Use instead of a
 *  plain div for cards that should feel alive. */
export function Tilt({ children, className = "", style = {}, max }) {
  const tilt = useTilt(max);
  return (
    <div
      ref={tilt.ref}
      style={{ ...style, ...tilt.style }}
      onMouseMove={tilt.onMove}
      onMouseLeave={tilt.onLeave}
      className={`tilt-card ${className}`}
    >
      {children}
    </div>
  );
}

/** Count-up number (timecode-counter feel). Animates from the previous
 *  value to the new one with an ease-out curve. */
export function CountUp({ value, suffix = "", duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const from = prevRef.current;
    const to = Number(value) || 0;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prevRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="tabular-nums">{display}{suffix}</span>;
}

/** Lower-third toasts — TV news-strap style: dark bar, accent edge,
 *  message, and a playout bar that depletes until auto-dismiss. */
export function Toasts() {
  const { toasts, dismissToast, theme } = useApp();
  const dark = theme.mode === "dark";
  if (!toasts.length) return null;
  const toneIcon = {
    success: <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />,
    rose: <AlertTriangle size={16} className="text-rose-500 shrink-0" />,
    info: <Info size={16} className="accent-text shrink-0" />,
  };
  return (
    <div className="fixed left-4 bottom-4 z-[60] space-y-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="anim-lower-third pointer-events-auto relative overflow-hidden rounded-2xl border shadow-2xl"
          style={{
            background: dark ? "rgba(13,17,26,.97)" : "rgba(255,255,255,.98)",
            borderColor: dark ? "rgba(255,255,255,.10)" : "rgba(15,23,42,.08)",
          }}
          role="status"
        >
          <div className="flex items-center gap-3 pl-1 pr-3 py-3">
            <span className="w-1.5 self-stretch rounded-full accent-gradient-bg shrink-0" />
            {toneIcon[t.tone] || toneIcon.success}
            <span className={`text-sm font-semibold flex-1 ${dark ? "text-white" : "text-slate-900"}`}>{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className={`p-1 rounded-lg shrink-0 ${dark ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-900/5"}`}
            >
              <X size={14} />
            </button>
          </div>
          <div className="absolute bottom-0 left-0 h-[3px] accent-gradient-bg toast-bar" />
        </div>
      ))}
    </div>
  );
}

/** Reusable modal: Escape + backdrop click close it. No fake save indicators. */
export function Modal({ open, onClose, title, children, wide }) {
  const { theme } = useApp();
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  const dark = theme.mode === "dark";
  // Portal to document.body: the modal is rendered deep inside
  // <main class="scene-stage"> (perspective) and <div class="anim-scene">
  // (retained transform), both of which trap `position: fixed` inside the
  // main column. Portaling escapes all ancestors, so the backdrop covers
  // the whole viewport (sidebar included) and the panel centres on screen.
  // React context (theme via useApp) still flows through the portal.
  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto p-4"
      style={{ background: "rgba(2,6,16,.65)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="min-h-full flex items-center justify-center py-6">
      <div
        className={`anim-pop glass rounded-3xl w-full ${wide ? "max-w-3xl" : "max-w-md"} p-6 sm:p-8 relative`}
        style={{ background: dark ? "rgba(13,17,26,.92)" : "rgba(255,255,255,.96)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className={`absolute top-4 right-4 p-2 rounded-xl transition ${dark ? "hover:bg-white/10 text-slate-300" : "hover:bg-slate-900/5 text-slate-500"}`}
        >
          <X size={18} />
        </button>
        {title && (
          <h3 className={`text-lg font-bold mb-5 pr-8 ${dark ? "text-white" : "text-slate-900"}`}>{title}</h3>
        )}
        {children}
      </div>
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, children, mono }) {
  const { theme } = useApp();
  const dark = theme.mode === "dark";
  return (
    <label className="block mb-4">
      <span className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${mono ? "font-mono" : ""} ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputCls = (dark) =>
  `w-full px-4 py-3 rounded-2xl border text-sm transition accent-ring ${
    dark
      ? "bg-white/5 border-white/20 text-white placeholder:text-slate-500 focus:border-white/40"
      : "bg-white border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;

export function PrimaryButton({ children, onClick, type = "button", disabled, className = "" }) {
  const mag = useMagnetic();
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      ref={mag.ref}
      style={mag.style}
      onMouseMove={mag.onMove}
      onMouseLeave={mag.onLeave}
      className={`btn-shutter btn-shine accent-gradient-bg text-white font-semibold text-sm px-5 py-3 rounded-2xl transition hover:opacity-90 active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, className = "" }) {
  const { theme } = useApp();
  const dark = theme.mode === "dark";
  const mag = useMagnetic();
  return (
    <button
      onClick={onClick}
      ref={mag.ref}
      style={mag.style}
      onMouseMove={mag.onMove}
      onMouseLeave={mag.onLeave}
      className={`btn-shutter text-sm font-semibold px-5 py-3 rounded-2xl border transition ${
        dark
          ? "border-white/10 text-slate-200 hover:bg-white/5"
          : "border-slate-200 text-slate-700 hover:bg-slate-900/5"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** DodgeButton — the button that runs away from a careless cursor.
 *  For destructive confirms (delete, remove): the cursor entering the
 *  padded zone makes the button jump to a random spot nearby. It dodges
 *  `maxDodges` times, then slides back home and stays put — so a deliberate
 *  click still works, but an accidental one can't land. Touch devices
 *  (no hover) never dodge. The label cycles through `labels` as it dodges.
 *  `onDodge(count)` reports each dodge so the caller can show a hint. */
export function DodgeButton({ children, onClick, className = "", labels, maxDodges = 3, onDodge }) {
  const [dodges, setDodges] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const dodge = () => {
    if (dodges >= maxDodges) return;
    if (typeof window !== "undefined" && window.matchMedia && !window.matchMedia("(pointer: fine)").matches) return;
    const next = dodges + 1;
    setDodges(next);
    if (onDodge) onDodge(next);
    // last dodge: slide back home and stay — the user really means it
    setOffset(
      next >= maxDodges
        ? { x: 0, y: 0 }
        : { x: Math.round((Math.random() * 2 - 1) * 56), y: Math.round((Math.random() * 2 - 1) * 34) }
    );
  };

  const label = labels ? labels[Math.min(dodges, labels.length - 1)] : children;
  return (
    <span className="flex-1 block" style={{ padding: 6, margin: -6 }} onMouseEnter={dodge}>
      <button
        type="button"
        onClick={onClick}
        className={`${className} w-full`}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: "transform 220ms cubic-bezier(.34,1.56,.64,1)" }}
      >
        {label}
      </button>
    </span>
  );
}

/** Confetti burst — fired when a task hits 100% (premiere celebration).
 *  Pieces fly up and fall with gravity, then fade. Mount with a fresh
 *  `key` each time it should fire again. */
export function ConfettiBurst({ pieces = 26 }) {
  const colors = ["#f43f5e", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
  const items = useMemo(() => Array.from({ length: pieces }, (_, i) => ({
    x: (Math.random() * 240 - 120).toFixed(0),
    y: (Math.random() * -150 - 40).toFixed(0),
    r: (Math.random() * 540 - 270).toFixed(0),
    s: (Math.random() * 6 + 5).toFixed(0),
    c: colors[i % colors.length],
    d: (Math.random() * 130).toFixed(0),
  })), [pieces]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible z-20" aria-hidden="true">
      {items.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            "--tx": `${p.x}px`,
            "--ty": `${p.y}px`,
            "--rot": `${p.r}deg`,
            width: p.s,
            height: (p.s * 0.62).toFixed(0),
            background: p.c,
            animationDelay: `${p.d}ms`,
            left: "50%",
            top: "40%",
          }}
        />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, body }) {
  const { theme } = useApp();
  const dark = theme.mode === "dark";
  return (
    <div className={`glass rounded-3xl p-10 text-center ${dark ? "" : ""}`}>
      <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 accent-gradient-bg text-white">
        {icon}
      </div>
      <h4 className={`font-bold mb-1 ${dark ? "text-white" : "text-slate-900"}`}>{title}</h4>
      <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>{body}</p>
    </div>
  );
}

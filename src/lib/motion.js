import { useEffect, useRef, useState } from "react";

/** 3D tilt: the card follows the cursor in 3D (rotateX/rotateY) and
 *  springs back flat when the cursor leaves. Attach ref + handlers
 *  to the card, and merge `style` into its style prop. */
export function useTilt(max = 7) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setStyle({
      transform: `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-4px)`,
    });
  };
  const onLeave = () => setStyle({});
  return { ref, style, onMove, onLeave };
}

/** Magnetic button: drifts a little toward the cursor, springs back
 *  on leave. Merge `style` into the button's style prop. */
export function useMagnetic(strength = 0.22) {
  const ref = useRef(null);
  const [style, setStyle] = useState({});
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    setStyle({ transform: `translate(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px)` });
  };
  const onLeave = () => setStyle({});
  return { ref, style, onMove, onLeave };
}

/** Cursor spotlight: writes the cursor position into --mx/--my CSS
 *  variables on the given element (no re-render, direct DOM write). */
export function useSpotlight() {
  const ref = useRef(null);
  useEffect(() => {
    const onMove = (e) => {
      const el = ref.current;
      if (!el) return;
      el.style.setProperty("--mx", `${e.clientX}px`);
      el.style.setProperty("--my", `${e.clientY}px`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  return ref;
}

/** Parallax: writes the cursor position inside the element into --px/--py
 *  CSS variables (-0.5..0.5). Layers read them with different multipliers
 *  (e.g. translate(calc(var(--px) * 30px), calc(var(--py) * 20px))). */
export function useParallax() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--px", px.toFixed(3));
      el.style.setProperty("--py", py.toFixed(3));
    };
    const onLeave = () => {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    };
    el.addEventListener("mousemove", onMove, { passive: true });
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);
  return ref;
}

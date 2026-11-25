import { useSpotlight } from "../lib/motion.js";

/** Fixed ambient background: near-black + blurred accent glow orbs (slow drift),
 *  a subtle cinematic light sweep, and a soft spotlight that follows the cursor. */
export default function Background() {
  const spotRef = useSpotlight();
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full blur-[120px] anim-drift-a"
        style={{ background: "var(--glow-1)" }}
      />
      <div
        className="absolute top-1/3 -right-48 w-[38rem] h-[38rem] rounded-full blur-[130px] anim-drift-b"
        style={{ background: "var(--glow-2)" }}
      />
      <div
        className="absolute -bottom-56 left-1/4 w-[30rem] h-[30rem] rounded-full blur-[120px] opacity-70 anim-drift-a"
        style={{ background: "var(--glow-1)" }}
      />
      {/* cinematic light sweep */}
      <div
        className="absolute top-0 bottom-0 w-56 anim-sweep-beam"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
        }}
      />
      {/* cursor spotlight — follows the mouse like a studio light */}
      <div
        ref={spotRef}
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(480px circle at var(--mx, 50%) var(--my, 35%), rgba(255,255,255,0.055), transparent 70%)",
        }}
      />
    </div>
  );
}

import { useState } from "react";
import { ShieldCheck, LogOut, Hourglass, ShieldX, RefreshCw, Aperture, UserPlus } from "lucide-react";
import { BRAND } from "../config/brand.js";
import { useApp } from "../store/AppContext.jsx";
import Background from "./Background.jsx";
import { GhostButton, Field, inputCls, PrimaryButton } from "./ui.jsx";

function LogoMark({ size = 44 }) {
  const { branding } = useApp();
  if (branding?.logoUrl) {
    return (
      <img
        src={branding.logoUrl}
        alt={BRAND.name}
        className="rounded-2xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-2xl flex items-center justify-center font-extrabold text-white relative overflow-hidden"
      style={{ width: size, height: size, background: "var(--accent-gradient)", fontSize: size * 0.5 }}
    >
      {BRAND.name.charAt(0)}
      <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
    </div>
  );
}
export { LogoMark };

/* Official Google "G" mark */
function GoogleMark({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function BrandHeader({ dark }) {
  return (
    <div className="text-center mb-8 anim-rise" style={{ "--d": "0ms" }}>
      {/* real aperture icon — asymmetric blades, so the slow spin is
          clearly visible (a dashed ring looked identical when rotated) */}
      <div className="flex justify-center mb-4">
        <div className="relative anim-aperture-open" style={{ width: 78, height: 78 }}>
          <Aperture size={78} strokeWidth={1.2} className="absolute inset-0 accent-text anim-aperture-ring" style={{ opacity: 0.85 }} />
          <div className="absolute inset-[13px]">
            <LogoMark size={52} />
          </div>
        </div>
      </div>
      <h1 className={`text-2xl font-extrabold tracking-tight uppercase ${dark ? "text-white" : "text-slate-900"}`}>
        {BRAND.legalName}
      </h1>
      <p className="accent-text text-xs font-bold uppercase tracking-[.2em] mt-1">{BRAND.tagline}</p>
      <p className={`text-sm mt-2 ${dark ? "text-slate-400" : "text-slate-500"}`}>{BRAND.portalDescriptor}</p>
    </div>
  );
}

export default function LoginScreen() {
  const { signInWithGoogle, theme } = useApp();
  const dark = theme.mode === "dark";
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await signInWithGoogle();
      if (!res.ok) setError(res.error || "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
      <Background />
      {/* film strip rails — scrolling sprocket holes, top + bottom */}
      <div className="filmstrip fixed top-0 left-0 right-0 z-0" aria-hidden="true" />
      <div className="filmstrip filmstrip-reverse fixed bottom-0 left-0 right-0 z-0" aria-hidden="true" />
      <div className="w-full max-w-md relative z-10">
        <BrandHeader dark={dark} />

        {/* Sign-in card — one option for everyone: Google */}
        <div className="glass rounded-3xl p-6 sm:p-8 anim-rise" style={{ "--d": "100ms" }}>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={16} className="accent-text" />
            <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>{BRAND.loginTitle}</h2>
          </div>
          <p className={`text-sm mb-6 ${dark ? "text-slate-400" : "text-slate-500"}`}>{BRAND.loginSubtitle}</p>

          {error && (
            <div className="mb-4 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={busy}
            className={`btn-shutter btn-shine w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition border ${
              dark
                ? "bg-white text-slate-900 border-white hover:bg-slate-100"
                : "bg-white text-slate-900 border-slate-200 hover:bg-slate-50 shadow-sm"
            } disabled:opacity-60`}
          >
            <GoogleMark size={20} />
            {busy ? "Connecting to Google…" : "Continue with Google"}
          </button>

          <p className={`text-xs text-center mt-4 leading-relaxed ${dark ? "text-slate-500" : "text-slate-400"}`}>
            Sign in with your Gmail account. First-time sign-ins fill in their
            details, then wait for the administrator to approve them.
          </p>
        </div>

        {/* Role explainer */}
        <div className="glass rounded-3xl p-5 mt-4 flex gap-3 anim-rise" style={{ "--d": "200ms" }}>
          <ShieldCheck size={18} className="accent-text shrink-0 mt-0.5" />
          <p className={`text-xs leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
            <span className={`font-bold ${dark ? "text-slate-200" : "text-slate-700"}`}>Role-based access:</span>{" "}
            Administrators manage staff, tasks and announcements. Team members access their assigned
            tasks, schedule and the suggestion box.
          </p>
        </div>

        <p className={`text-center text-xs mt-6 anim-rise ${dark ? "text-slate-500" : "text-slate-400"}`} style={{ "--d": "300ms" }}>
          {BRAND.legalName} · {BRAND.footerCredit}
        </p>
      </div>
    </div>
  );
}

/* Shown when signed in with Google but not yet approved (or rejected). */
export function PendingApprovalScreen() {
  const { session, approvalStatus, logout, theme } = useApp();
  const dark = theme.mode === "dark";
  const rejected = approvalStatus === "rejected";
  const meta = session?.user?.user_metadata || {};
  const name = meta.full_name || meta.name || "";
  const email = session?.user?.email || "";

  return (
    <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
      <Background />
      <div className="filmstrip fixed top-0 left-0 right-0 z-0" aria-hidden="true" />
      <div className="filmstrip filmstrip-reverse fixed bottom-0 left-0 right-0 z-0" aria-hidden="true" />
      <div className="w-full max-w-md relative z-10">
        <BrandHeader dark={dark} />
        <div className="glass rounded-3xl p-6 sm:p-8 text-center anim-rise" style={{ "--d": "100ms" }}>
          <div
            className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
              rejected ? "bg-rose-500/10 text-rose-500" : "bg-amber-400/10 text-amber-500"
            }`}
          >
            {rejected ? <ShieldX size={28} /> : <Hourglass size={28} />}
          </div>
          <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>
            {rejected ? "Request not approved" : "Waiting for approval"}
          </h2>
          <p className={`text-sm mt-2 leading-relaxed ${dark ? "text-slate-400" : "text-slate-500"}`}>
            {rejected
              ? "Your access request was not approved. You can request again — your request will go back to the administrator."
              : "Your sign-in request is with the administrator. You'll enter the workspace automatically once it's approved — no need to sign in again."}
          </p>
          {(name || email) && (
            <div className={`mt-5 px-4 py-3 rounded-2xl text-sm ${dark ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
              {name && <div className="font-bold">{name}</div>}
              {email && <div className="font-mono text-xs mt-0.5 opacity-70">{email}</div>}
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <GhostButton onClick={() => window.location.reload()} className="flex-1 flex items-center justify-center gap-2">
              <RefreshCw size={15} /> {rejected ? "Request again" : "Check again"}
            </GhostButton>
            <GhostButton onClick={logout} className="flex-1 flex items-center justify-center gap-2 !text-rose-500">
              <LogOut size={15} /> Sign out
            </GhostButton>
          </div>
        </div>
        <p className={`text-center text-xs mt-6 ${dark ? "text-slate-500" : "text-slate-400"}`}>
          {BRAND.supportNote}
        </p>
      </div>
    </div>
  );
}

/* Shown right after Google sign-in when the member hasn't filled in their
 * details yet. The request only reaches the admin once this is submitted. */
export function RequestDetailsScreen() {
  const { session, submitApprovalDetails, logout, theme } = useApp();
  const dark = theme.mode === "dark";
  const meta = session?.user?.user_metadata || {};
  const googleName = meta.full_name || meta.name || "";
  const email = session?.user?.email || "";
  const [name, setName] = useState(googleName);
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your full name."); return; }
    if (!title.trim()) { setError("Please enter your job title — the admin approves you for a role."); return; }
    setBusy(true);
    try {
      const res = await submitApprovalDetails({ name, title, phone });
      if (!res.ok) setError(res.error);
      // success → approvalStatus flips to pending, waiting screen takes over
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center p-4 sm:p-6">
      <Background />
      <div className="filmstrip fixed top-0 left-0 right-0 z-0" aria-hidden="true" />
      <div className="filmstrip filmstrip-reverse fixed bottom-0 left-0 right-0 z-0" aria-hidden="true" />
      <div className="w-full max-w-md relative z-10">
        <BrandHeader dark={dark} />
        <div className="glass rounded-3xl p-6 sm:p-8 anim-rise" style={{ "--d": "100ms" }}>
          <div className="flex items-center gap-2 mb-1">
            <UserPlus size={16} className="accent-text" />
            <h2 className={`text-lg font-bold ${dark ? "text-white" : "text-slate-900"}`}>Complete your request</h2>
          </div>
          <p className={`text-sm mb-6 ${dark ? "text-slate-400" : "text-slate-500"}`}>
            You're signed in with Google. Tell the studio who you are — the
            administrator approves this whole profile.
          </p>
          {(googleName || email) && (
            <div className={`mb-5 px-4 py-3 rounded-2xl text-sm ${dark ? "bg-white/5 text-slate-300" : "bg-slate-50 text-slate-600"}`}>
              {googleName && <div className="font-bold">{googleName}</div>}
              {email && <div className="font-mono text-xs mt-0.5 opacity-70">{email}</div>}
            </div>
          )}
          <form onSubmit={submit}>
            <Field label="Full name">
              <input className={inputCls(dark)} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Khan" autoComplete="name" />
            </Field>
            <Field label="Job title">
              <input className={inputCls(dark)} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Video Editor, Cameraman" autoComplete="organization-title" />
            </Field>
            <Field label="Phone / WhatsApp (optional)">
              <input type="tel" className={inputCls(dark)} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0300-1234567" autoComplete="tel" />
            </Field>
            {error && (
              <div className="mb-4 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">{error}</div>
            )}
            <PrimaryButton type="submit" disabled={busy} className="w-full">
              {busy ? "Sending…" : "Send request for approval"}
            </PrimaryButton>
          </form>
          <button
            onClick={logout}
            className={`w-full text-center text-xs font-semibold mt-4 ${dark ? "text-slate-400" : "text-slate-500"} hover:opacity-80`}
          >
            Sign out instead
          </button>
        </div>
        <p className={`text-center text-xs mt-6 ${dark ? "text-slate-500" : "text-slate-400"}`}>
          {BRAND.supportNote}
        </p>
      </div>
    </div>
  );
}

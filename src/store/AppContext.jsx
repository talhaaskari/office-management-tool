import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase.js";
import { PERMISSIONS, ROLES } from "../config/brand.js";
import { todayISO } from "../lib/dates.js";
import { XP, levelFor, xpTotalFor } from "../lib/gamification.js";
import { PEACE_LOGO_DATA_URI } from "../lib/peaceLogo.js";

const THEME_KEY = "peace_staff_theme_v1"; // per-device UI preference stays local

/* ------------------------- mappers: DB <-> app ------------------------- */
const toMillis = (iso) => (iso ? new Date(iso).getTime() : null);
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`);

function mapProfile(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    role: p.role,
    email: p.email,
    permissions: p.permissions ?? null,
    mustChangePassword: !!p.must_change_password,
    createdAt: toMillis(p.created_at),
  };
}

function mapNote(n) {
  return { id: n.id, authorId: n.author_id, text: n.text, at: toMillis(n.created_at) };
}

function mapTask(t, notes) {
  return {
    id: t.id,
    code: t.code,
    project: t.project,
    title: t.title,
    detail: t.detail || "",
    assigneeId: t.assignee_id,
    priority: t.priority,
    status: t.status,
    progress: t.progress ?? 0,
    dueDate: t.due_date,
    notes: (notes || []).map(mapNote),
    createdAt: toMillis(t.created_at),
  };
}

function mapAnnouncement(a) {
  return {
    id: a.id,
    authorId: a.author_id,
    title: a.title,
    body: a.body,
    at: toMillis(a.created_at),
  };
}

function mapSuggestion(s) {
  return { id: s.id, category: s.category, text: s.text, at: toMillis(s.created_at) };
}

function mapReport(r) {
  return {
    id: r.id,
    userId: r.user_id,
    date: r.date,
    work: r.work,
    blockers: r.blockers || "",
    at: toMillis(r.created_at),
  };
}

function mapLeave(l) {
  return {
    id: l.id,
    userId: l.user_id,
    type: l.type,
    startDate: l.start_date,
    endDate: l.end_date,
    reason: l.reason || "",
    status: l.status,
    decidedBy: l.decided_by,
    decidedAt: toMillis(l.decided_at),
    createdAt: toMillis(l.created_at),
  };
}

function mapXpEvent(e) {
  return {
    id: e.id,
    userId: e.user_id,
    kind: e.kind,
    refId: e.ref_id,
    points: e.points,
    at: toMillis(e.created_at),
  };
}

function mapBranding(s) {
  if (!s) return null;
  return {
    logoUrl: s.logo_url || PEACE_LOGO_DATA_URI, // bundled Peace logo is the default; admin can override it in Branding
    themeMode: s.theme_mode || "dark",
    themeAccent: s.theme_accent || "cobalt",
    forceTheme: !!s.force_theme,
    eventName: s.event_name || "",
  };
}

function mapApproval(a) {
  if (!a) return null;
  return {
    id: a.id,
    authUserId: a.auth_user_id,
    email: a.email,
    name: a.name,
    title: a.title || "",
    phone: a.phone || "",
    avatarUrl: a.avatar_url || null,
    status: a.status,
    createdAt: toMillis(a.created_at),
    decidedBy: a.decided_by,
    decidedAt: toMillis(a.decided_at),
  };
}

const DEFAULT_BRANDING = { logoUrl: PEACE_LOGO_DATA_URI, themeMode: "dark", themeAccent: "cobalt", forceTheme: false, eventName: "" };

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [reports, setReports] = useState([]);
  const [readSet, setReadSet] = useState(new Set()); // "userId:annId" for current user
  const [session, setSession] = useState(null); // supabase auth session
  const [currentUser, setCurrentUser] = useState(null); // mapped profile
  const [approvalStatus, setApprovalStatus] = useState(null); // null | 'pending' | 'rejected' — signed in but no profile yet
  const [needsDetails, setNeedsDetails] = useState(false); // true while a new member still has to fill in name/title/phone
  const [pendingApprovals, setPendingApprovals] = useState([]); // admin-only list
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [xpEvents, setXpEvents] = useState([]);
  const [mascot, setMascot] = useState({ mood: "idle", message: "", key: 0 }); // Clappy's mood + speech bubble
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]); // lower-third notifications

  /* ------------------------- toasts (lower-third) ------------------------- */
  const pushToast = (message, tone = "success") => {
    const id = newId();
    setToasts((prev) => [...prev.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4200);
  };
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [theme, setTheme] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(THEME_KEY) || "null") || { mode: "dark", accent: "cobalt" };
    } catch {
      return { mode: "dark", accent: "cobalt" };
    }
  });
  const currentUserRef = useRef(null);
  currentUserRef.current = currentUser;

  /* ------------------------- data loading ------------------------- */
  const loadAll = async (userId) => {
    const [pRes, tRes, nRes, aRes, sRes, rRes, rdRes, bRes, lRes, xRes] = await Promise.all([
      supabase.from("profiles").select("*").order("name"),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("task_notes").select("*").order("created_at", { ascending: true }),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("suggestions").select("*").order("created_at", { ascending: false }),
      supabase.from("reports").select("*").order("created_at", { ascending: false }),
      userId
        ? supabase.from("announcement_reads").select("announcement_id").eq("user_id", userId)
        : { data: [] },
      supabase.from("workspace_settings").select("*").eq("id", 1).single(),
      supabase.from("leave_requests").select("*").order("created_at", { ascending: false })
        .then((r) => { if (r.error) console.error("loadLeave failed (run leave-requests.sql?):", r.error.message); return r; }),
      supabase.from("xp_events").select("*").order("created_at", { ascending: false })
        .then((r) => { if (r.error) console.error("loadXp failed (run gamification.sql?):", r.error.message); return r; }),
    ]);
    if (pRes.data) setUsers(pRes.data.map(mapProfile));
    if (tRes.data) {
      const notesByTask = {};
      (nRes.data || []).forEach((n) => {
        (notesByTask[n.task_id] = notesByTask[n.task_id] || []).push(n);
      });
      setTasks(tRes.data.map((t) => mapTask(t, notesByTask[t.id])));
    }
    if (aRes.data) setAnnouncements(aRes.data.map(mapAnnouncement));
    if (sRes.data) setSuggestions(sRes.data.map(mapSuggestion));
    if (rRes.data) setReports(rRes.data.map(mapReport));
    if (rdRes.data) setReadSet(new Set(rdRes.data.map((r) => `${userId}:${r.announcement_id}`)));
    if (bRes.data) setBranding(mapBranding(bRes.data));
    if (lRes.data) setLeaveRequests(lRes.data.map(mapLeave));
    if (xRes.data) setXpEvents(xRes.data.map(mapXpEvent));
  };

  const loadProfile = async (authUserId) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", authUserId).single();
    return mapProfile(data);
  };

  // Signed in with Google but no staff profile yet: read the approval
  // request (if any). The request is created by the details form, not
  // automatically — so the admin always gets name, title and phone.
  const getApprovalRequest = async (authUser) => {
    const { data } = await supabase
      .from("pending_approvals")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();
    return data || null;
  };

  // Submit (first time) or fill in (details missing) the approval request.
  // Insert is covered by the "request own approval" policy; update of one's
  // own PENDING row by the "own pending request details" policy.
  const submitApprovalDetails = async ({ name, title, phone }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Not signed in — please sign in with Google again." };
    const payload = {
      name: (name || "").trim() || (user.email || "").split("@")[0] || "New member",
      title: (title || "").trim() || null,
      phone: (phone || "").trim() || null,
    };
    const existing = await getApprovalRequest(user);
    if (existing) {
      const { error } = await supabase
        .from("pending_approvals")
        .update(payload)
        .eq("id", existing.id);
      if (error) return { ok: false, error: error.message };
    } else {
      const meta = user.user_metadata || {};
      const { error } = await supabase
        .from("pending_approvals")
        .insert({
          auth_user_id: user.id,
          email: (user.email || "").toLowerCase(),
          name: payload.name,
          title: payload.title,
          phone: payload.phone,
          avatar_url: meta.avatar_url || meta.picture || null,
        });
      if (error) return { ok: false, error: error.message };
    }
    setNeedsDetails(false);
    setApprovalStatus("pending");
    return { ok: true };
  };

  const loadPendingApprovals = async () => {
    const { data } = await supabase
      .from("pending_approvals")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPendingApprovals(data.map(mapApproval));
  };

  // Resolve one signed-in user: profile → full access; otherwise approval gate.
  // allowReapply=true ONLY on a fresh sign-in / page load: a rejected request,
  // or an approved request whose profile is gone (member was removed), goes
  // back to the pending queue — nobody is ever locked out for good. It is
  // deliberately OFF for realtime refreshes, so an admin's rejection is never
  // undone the second it lands on the waiting user's screen.
  const resolveSessionUser = async (authUser, { allowReapply = false } = {}) => {
    const profile = await loadProfile(authUser.id);
    if (profile) {
      setNeedsDetails(false);
      setApprovalStatus(null);
      setCurrentUser(profile);
      await loadAll(authUser.id);
      if (profile.role === "admin") await loadPendingApprovals();
      return;
    }
    setCurrentUser(null);
    let req = await getApprovalRequest(authUser);
    if (req && (req.status === "rejected" || req.status === "approved")) {
      if (!allowReapply) {
        // realtime refresh: report the decided state as-is, don't undo it
        setNeedsDetails(false);
        setApprovalStatus(req.status === "rejected" ? "rejected" : "pending");
        return;
      }
      const { error } = await supabase
        .from("pending_approvals")
        .update({ status: "pending", decided_by: null, decided_at: null })
        .eq("id", req.id);
      if (error) {
        console.error("Re-apply failed (re-apply policy may not be installed):", error.message);
        setNeedsDetails(false);
        setApprovalStatus("rejected");
        return;
      }
      req = { ...req, status: "pending" };
    }
    if (!req) {
      // first time here: fill in name/title/phone before the request exists
      setNeedsDetails(true);
      setApprovalStatus(null);
      return;
    }
    if (req.status === "pending" && !req.title) {
      // request exists (made before the details step) but has no details yet
      setNeedsDetails(true);
      setApprovalStatus(null);
      return;
    }
    setNeedsDetails(false);
    setApprovalStatus("pending");
  };

  /* ------------------------- auth lifecycle ------------------------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      // Google login ke baad URL me bacha hua "#" (access_token hash) saaf karo
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      const s = data.session || null;
      if (!mounted) return;
      setSession(s);
      if (s?.user) await resolveSessionUser(s.user, { allowReapply: true });
      if (mounted) setLoading(false);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (s?.user) {
        // a real sign-in (re)opens the re-apply path; token refreshes don't
        await resolveSessionUser(s.user, { allowReapply: event === "SIGNED_IN" || event === "INITIAL_SESSION" });
      } else {
        setCurrentUser(null);
        setApprovalStatus(null);
        setNeedsDetails(false);
        setPendingApprovals([]);
        setUsers([]); setTasks([]); setAnnouncements([]);
        setSuggestions([]); setReports([]); setReadSet(new Set());
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------- realtime sync ------------------------- */
  useEffect(() => {
    if (!session?.user) return;
    const uid = session.user.id;
    const refresh = () => loadAll(uid);
    const ch = supabase
      .channel("peace-staff-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "task_notes" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_reads" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_settings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "leave_requests" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "xp_events" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "pending_approvals" }, async () => {
        const me = currentUserRef.current;
        if (me?.role === "admin") { loadPendingApprovals(); return; }
        // a waiting user may have just been approved — re-check live.
        // No re-apply here: a rejection must stick until the user
        // deliberately signs in again.
        const { data } = await supabase.auth.getUser();
        if (data.user && !me) await resolveSessionUser(data.user, { allowReapply: false });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  /* ------------------------- theme (local, or admin-forced) ------------------------- */
  const effectiveTheme = branding.forceTheme
    ? { mode: branding.themeMode, accent: branding.themeAccent }
    : theme;
  useEffect(() => {
    if (!branding.forceTheme) {
      try { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); } catch {}
    }
    const root = document.documentElement;
    root.classList.toggle("light", effectiveTheme.mode === "light");
    root.setAttribute("data-accent", effectiveTheme.accent);
    document.body.style.background = effectiveTheme.mode === "light" ? "#f1f5f9" : "#090b0f";
    document.body.style.color = effectiveTheme.mode === "light" ? "#0f172a" : "#f1f5f9";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, branding.forceTheme, branding.themeMode, branding.themeAccent]);

  /* ------------------------- branding (admin) ------------------------- */
  const updateBranding = async (patch) => {
    const me = currentUserRef.current;
    if (!me || me.role !== "admin") return { ok: false, error: "Only administrators can change branding." };
    const db = {};
    if (patch.logoUrl !== undefined) db.logo_url = patch.logoUrl;
    if (patch.themeMode !== undefined) db.theme_mode = patch.themeMode;
    if (patch.themeAccent !== undefined) db.theme_accent = patch.themeAccent;
    if (patch.forceTheme !== undefined) db.force_theme = patch.forceTheme;
    if (patch.eventName !== undefined) db.event_name = patch.eventName || null;
    db.updated_by = me.id;
    db.updated_at = new Date().toISOString();
    const { error } = await supabase.from("workspace_settings").update(db).eq("id", 1);
    if (error) return { ok: false, error: error.message };
    setBranding((b) => ({
      ...b,
      ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
      ...(patch.themeMode !== undefined ? { themeMode: patch.themeMode } : {}),
      ...(patch.themeAccent !== undefined ? { themeAccent: patch.themeAccent } : {}),
      ...(patch.forceTheme !== undefined ? { forceTheme: patch.forceTheme } : {}),
      ...(patch.eventName !== undefined ? { eventName: patch.eventName } : {}),
    }));
    return { ok: true };
  };

  const uploadLogo = async (file) => {
    const me = currentUserRef.current;
    if (!me || me.role !== "admin") return { ok: false, error: "Only administrators can upload a logo." };
    const ext = (file.name.split(".").pop() || "png").toLowerCase().slice(0, 4);
    const path = `logo-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      contentType: file.type, upsert: true,
    });
    if (error) return { ok: false, error: error.message };
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    return updateBranding({ logoUrl: data.publicUrl });
  };

  const removeLogo = async () => updateBranding({ logoUrl: null });

  /* ------------------------- permissions ------------------------- */
  const can = (perm) => {
    if (!currentUser) return false;
    if (currentUser.permissions && perm in currentUser.permissions) {
      return !!currentUser.permissions[perm];
    }
    return !!PERMISSIONS[currentUser.role]?.[perm];
  };

  /* ------------------------- auth actions ------------------------- */
  // One sign-in for everyone: Google (Gmail). No passwords anywhere.
  // After Google sign-in, new members fill in name/title/phone first —
  // the admin approves the full profile, not just a Gmail address.
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setApprovalStatus(null);
  };

  /* ------------------------- admin: approvals ------------------------- */
  // Approve a Google sign-in request. Optionally LINK it to an existing
  // member (e.g. when staff move from @peacestaff.internal to Gmail):
  // all of that member's tasks, notes, announcements, reads and reports
  // move to the new Google account, and the old profile is replaced.
  const approveRequest = async (requestId, { role, title, linkToProfileId }) => {
    const me = currentUserRef.current;
    if (!me || me.role !== "admin") return { ok: false, error: "Only administrators can approve members." };
    const req = pendingApprovals.find((r) => r.id === requestId);
    if (!req) return { ok: false, error: "Request not found — it may already have been decided." };
    const newId = req.authUserId;

    if (linkToProfileId && linkToProfileId !== newId) {
      const old = users.find((u) => u.id === linkToProfileId);
      if (!old) return { ok: false, error: "The member to link to was not found." };
      // 1. create the new profile FIRST (FK targets must exist before references move)
      const { error: insErr } = await supabase.from("profiles").insert({
        id: newId,
        name: old.name,
        title: (title || "").trim() || old.title,
        role: ROLES.some((r) => r.id === role) ? role : old.role,
        email: req.email,
        permissions: old.permissions ?? null,
        must_change_password: false,
      });
      if (insErr) return { ok: false, error: insErr.message };
      // 2. move every reference from the old profile to the new Google id
      const moves = [
        supabase.from("tasks").update({ assignee_id: newId }).eq("assignee_id", old.id),
        supabase.from("task_notes").update({ author_id: newId }).eq("author_id", old.id),
        supabase.from("announcements").update({ author_id: newId }).eq("author_id", old.id),
        supabase.from("announcement_reads").update({ user_id: newId }).eq("user_id", old.id),
        supabase.from("reports").update({ user_id: newId }).eq("user_id", old.id),
        supabase.from("workspace_settings").update({ updated_by: newId }).eq("updated_by", old.id),
      ];
      const results = await Promise.all(moves);
      const failed = results.find((r) => r.error);
      if (failed) return { ok: false, error: failed.error.message };
      // 3. now the old profile can go
      const { error: delErr } = await supabase.from("profiles").delete().eq("id", old.id);
      if (delErr) return { ok: false, error: delErr.message };
    } else {
      // fresh member
      const { error } = await supabase.from("profiles").insert({
        id: newId,
        name: req.name,
        title: (title || "").trim() || "Staff",
        role: ROLES.some((r) => r.id === role) ? role : "staff",
        email: req.email,
        permissions: null,
        must_change_password: false,
      });
      if (error) return { ok: false, error: error.message };
    }

    const { error: decErr } = await supabase
      .from("pending_approvals")
      .update({ status: "approved", decided_by: me.id, decided_at: new Date().toISOString() })
      .eq("id", requestId);
    if (decErr) return { ok: false, error: decErr.message };
    await loadAll(me.id);
    await loadPendingApprovals();
    pushToast(`${req.name || req.email} approved`);
    return { ok: true };
  };

  const rejectRequest = async (requestId) => {
    const me = currentUserRef.current;
    if (!me || me.role !== "admin") return { ok: false, error: "Only administrators can reject members." };
    const { error } = await supabase
      .from("pending_approvals")
      .update({ status: "rejected", decided_by: me.id, decided_at: new Date().toISOString() })
      .eq("id", requestId);
    if (error) return { ok: false, error: error.message };
    await loadPendingApprovals();
    pushToast("Request rejected", "rose");
    return { ok: true };
  };

  /* ------------------------- admin: members ------------------------- */
  const removeUser = async (id) => {
    if (id === currentUserRef.current?.id) return false;
    // remove profile only — the Google auth user stays, so the person can
    // sign in again and re-request approval (or be re-added from Approvals).
    // Their tasks become unassigned (assignee_id is ON DELETE SET NULL).
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) return false;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    return true;
  };

  const updateUserRole = async (id, role) => {
    if (id === currentUserRef.current?.id) return;
    if (!ROLES.some((r) => r.id === role)) return;
    const { error } = await supabase.from("profiles").update({ role, permissions: null }).eq("id", id);
    if (error) return;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role, permissions: null } : u)));
    pushToast("Role updated");
  };

  const updateUserPermissions = async (id, permissions) => {
    if (id === currentUserRef.current?.id) return;
    const { error } = await supabase.from("profiles").update({ permissions }).eq("id", id);
    if (error) return;
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, permissions } : u)));
  };

  /* ------------------------- tasks ------------------------- */
  const nextTaskCode = () => {
    const nums = tasks.map((t) => parseInt(String(t.code).replace(/\D/g, ""), 10)).filter(Boolean);
    const n = nums.length ? Math.max(...nums) + 1 : 1001;
    return `TSK-${n}`;
  };

  const addTask = (data) => {
    const t = {
      id: newId(),
      code: nextTaskCode(),
      project: data.project.trim(),
      title: data.title.trim(),
      detail: data.detail.trim(),
      assigneeId: data.assigneeId,
      priority: data.priority,
      status: data.status,
      progress: Math.max(0, Math.min(100, Number(data.progress) || 0)),
      dueDate: data.dueDate,
      notes: [],
      createdAt: Date.now(),
    };
    setTasks((prev) => [t, ...prev]);
    pushToast(`Task ${t.code} created`);
    supabase.from("tasks").insert({
      id: t.id, code: t.code, project: t.project, title: t.title, detail: t.detail,
      assignee_id: t.assigneeId, priority: t.priority, status: t.status,
      progress: t.progress, due_date: t.dueDate || null,
    }).then(({ error }) => { if (error) console.error("addTask failed:", error.message); });
    return t;
  };

  const updateTask = (id, patch) => {
    const cur = tasks.find((t) => t.id === id);
    const nextProgress = patch.progress !== undefined
      ? Math.max(0, Math.min(100, Math.round(patch.progress)))
      : cur?.progress;
    const nextStatus = nextProgress === 100 ? "done" : (patch.status !== undefined ? patch.status : cur?.status);
    const willBeDone = nextStatus === "done" && cur?.status !== "done";
    setTasks((prev) => prev.map((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch };
      if (typeof next.progress === "number") {
        next.progress = Math.max(0, Math.min(100, Math.round(next.progress)));
        if (next.progress === 100) next.status = "done";
        else if (next.status === "done") next.status = "in-progress";
      }
      return next;
    }));
    const db = {};
    if (patch.project !== undefined) db.project = patch.project;
    if (patch.title !== undefined) db.title = patch.title;
    if (patch.detail !== undefined) db.detail = patch.detail;
    if (patch.assigneeId !== undefined) db.assignee_id = patch.assigneeId;
    if (patch.priority !== undefined) db.priority = patch.priority;
    if (patch.status !== undefined) db.status = patch.status;
    if (patch.dueDate !== undefined) db.due_date = patch.dueDate || null;
    if (patch.progress !== undefined) {
      const p = Math.max(0, Math.min(100, Math.round(patch.progress)));
      db.progress = p;
      const curStatus = patch.status !== undefined ? patch.status : cur?.status;
      db.status = p === 100 ? "done" : curStatus === "done" ? "in-progress" : curStatus;
    }
    supabase.from("tasks").update(db).eq("id", id)
      .then(({ error }) => { if (error) console.error("updateTask failed:", error.message); });
    // gamification: finishing a task pays XP to the assignee (once per task)
    if (willBeDone && cur) {
      const earner = cur.assigneeId || currentUserRef.current?.id;
      const me = currentUserRef.current?.id;
      awardXp(earner, "task_done", id, XP.TASK_DONE);
      if (cur.dueDate && cur.dueDate > todayISO()) {
        awardXp(earner, "task_early", id, XP.TASK_EARLY);
      }
      if (earner === me) {
        triggerMascot("happy", `+${XP.TASK_DONE} XP — “${cur.title}” done!`);
      }
    }
  };

  const deleteTask = (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    pushToast("Task deleted", "rose");
    supabase.from("tasks").delete().eq("id", id)
      .then(({ error }) => { if (error) console.error("deleteTask failed:", error.message); });
  };

  const addNote = (taskId, authorId, text) => {
    const note = { id: newId(), authorId, text: text.trim(), at: Date.now() };
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, notes: [...t.notes, note] } : t)));
    supabase.from("task_notes").insert({ id: note.id, task_id: taskId, author_id: authorId, text: note.text })
      .then(({ error }) => { if (error) console.error("addNote failed:", error.message); });
  };

  /* ------------------------- announcements ------------------------- */
  const addAnnouncement = ({ title, body }) => {
    const a = { id: newId(), authorId: currentUserRef.current?.id, title: title.trim(), body: body.trim(), at: Date.now() };
    setAnnouncements((prev) => [a, ...prev]);
    pushToast("Announcement posted");
    supabase.from("announcements").insert({ id: a.id, author_id: a.authorId, title: a.title, body: a.body })
      .then(({ error }) => { if (error) console.error("addAnnouncement failed:", error.message); });
  };

  const deleteAnnouncement = (id) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    pushToast("Announcement deleted", "rose");
    supabase.from("announcements").delete().eq("id", id)
      .then(({ error }) => { if (error) console.error("deleteAnnouncement failed:", error.message); });
  };

  const markAnnouncementRead = (annId) => {
    const me = currentUserRef.current;
    if (!me) return;
    const key = `${me.id}:${annId}`;
    setReadSet((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    supabase.from("announcement_reads").upsert({ announcement_id: annId, user_id: me.id }, { onConflict: "announcement_id,user_id" })
      .then(({ error }) => { if (error) console.error("markRead failed:", error.message); });
  };

  const markAllRead = () => {
    const me = currentUserRef.current;
    if (!me) return;
    setReadSet((prev) => {
      const next = new Set(prev);
      announcements.forEach((a) => next.add(`${me.id}:${a.id}`));
      return next;
    });
    const rows = announcements.map((a) => ({ announcement_id: a.id, user_id: me.id }));
    if (rows.length) {
      supabase.from("announcement_reads").upsert(rows, { onConflict: "announcement_id,user_id" })
        .then(({ error }) => { if (error) console.error("markAllRead failed:", error.message); });
    }
  };

  const unreadCount = currentUser
    ? announcements.filter((a) => !readSet.has(`${currentUser.id}:${a.id}`)).length
    : 0;

  /* ------------------------- suggestions & reports ------------------------- */
  const addSuggestion = ({ category, text }) => {
    // Zero user linkage: we deliberately do NOT store who submitted it.
    const s = { id: newId(), category, text: text.trim(), at: Date.now() };
    setSuggestions((prev) => [s, ...prev]);
    pushToast("Suggestion sent — thank you!");
    supabase.from("suggestions").insert({ id: s.id, category: s.category, text: s.text })
      .then(({ error }) => { if (error) console.error("addSuggestion failed:", error.message); });
  };

  const addReport = ({ work, blockers, date }) => {
    // date: YYYY-MM-DD string; defaults to today. Callers enforce the 48h window.
    const r = {
      id: newId(), userId: currentUserRef.current?.id,
      date: date || new Date().toISOString().slice(0, 10),
      work: work.trim(), blockers: blockers.trim(), at: Date.now(),
    };
    setReports((prev) => [r, ...prev]);
    pushToast("Daily report submitted");
    supabase.from("reports").insert({ id: r.id, user_id: r.userId, date: r.date, work: r.work, blockers: r.blockers })
      .then(({ error }) => { if (error) console.error("addReport failed:", error.message); });
    if (r.userId) awardXp(r.userId, "report", r.id, XP.REPORT);
  };

  /* ------------------------- mascot (Clappy) ------------------------- */
  const triggerMascot = (mood, message) => {
    setMascot({ mood, message: message || "", key: Date.now() });
  };

  /* ------------------------- gamification ------------------------- */
  // Append-only XP ledger. The (user_id, kind, ref_id) unique key means the
  // same action can never pay twice — a duplicate upsert is ignored.
  const awardXp = async (userId, kind, refId, points) => {
    if (!userId || !points) return { ok: false };
    const prevTotal = xpTotalFor(xpEvents, userId);
    const { data, error } = await supabase
      .from("xp_events")
      .upsert({ user_id: userId, kind, ref_id: refId, points }, { onConflict: "user_id,kind,ref_id", ignoreDuplicates: true })
      .select();
    if (error) { console.error("awardXp failed (run gamification.sql?):", error.message); return { ok: false }; }
    if (!data || data.length === 0) return { ok: true, duplicate: true }; // already paid once
    const ev = mapXpEvent(data[0]);
    setXpEvents((prev) => [ev, ...prev]);
    const newTotal = prevTotal + points;
    const prevLevel = levelFor(prevTotal).level;
    const nextLevel = levelFor(newTotal);
    if (nextLevel.level > prevLevel && userId === currentUserRef.current?.id) {
      pushToast(`Level up! You're now ${nextLevel.name} (Level ${nextLevel.level})`, "emerald");
      triggerMascot("celebrate", `Level up! You're now ${nextLevel.name}!`);
    }
    return { ok: true, event: ev, total: newTotal };
  };

  /* ------------------------- leave (chhutti) ------------------------- */
  const requestLeave = async ({ type, startDate, endDate, reason }) => {
    const me = currentUserRef.current;
    if (!me) return { ok: false, error: "Not signed in." };
    const l = {
      id: newId(), userId: me.id, type,
      startDate, endDate, reason: (reason || "").trim(),
      status: "pending", decidedBy: null, decidedAt: null, createdAt: Date.now(),
    };
    setLeaveRequests((prev) => [l, ...prev]);
    pushToast("Leave request sent to the admin");
    const { error } = await supabase.from("leave_requests").insert({
      id: l.id, user_id: l.userId, type: l.type,
      start_date: l.startDate, end_date: l.endDate, reason: l.reason,
    });
    if (error) {
      console.error("requestLeave failed (run leave-requests.sql?):", error.message);
      setLeaveRequests((prev) => prev.filter((x) => x.id !== l.id));
      return { ok: false, error: error.message };
    }
    return { ok: true };
  };

  const decideLeave = async (id, status) => {
    const me = currentUserRef.current;
    if (!me) return { ok: false, error: "Not signed in." };
    setLeaveRequests((prev) => prev.map((l) => (l.id === id ? { ...l, status, decidedBy: me.id, decidedAt: Date.now() } : l)));
    pushToast(status === "approved" ? "Leave approved" : "Leave rejected", status === "approved" ? "emerald" : "rose");
    const { error } = await supabase.from("leave_requests")
      .update({ status, decided_by: me.id, decided_at: new Date().toISOString() })
      .eq("id", id);
    if (error) { console.error("decideLeave failed:", error.message); return { ok: false, error: error.message }; }
    return { ok: true };
  };

  const cancelLeave = async (id) => {
    setLeaveRequests((prev) => prev.filter((l) => l.id !== id));
    pushToast("Leave request cancelled", "rose");
    const { error } = await supabase.from("leave_requests").delete().eq("id", id);
    if (error) { console.error("cancelLeave failed:", error.message); return { ok: false, error: error.message }; }
    return { ok: true };
  };

  /* ------------------------- theme ------------------------- */
  const setMode = (mode) => setTheme((t) => ({ ...t, mode }));
  const setAccent = (accent) => setTheme((t) => ({ ...t, accent }));

  // readMap kept for API compatibility (derived from readSet)
  const readMap = useMemo(() => {
    const m = {};
    readSet.forEach((key) => {
      const idx = key.indexOf(":");
      const u = key.slice(0, idx);
      const a = key.slice(idx + 1);
      (m[u] = m[u] || []).push(a);
    });
    return m;
  }, [readSet]);

  const value = {
    users, tasks, announcements, suggestions, reports, readMap,
    session, currentUser, approvalStatus, needsDetails, pendingApprovals, theme: effectiveTheme, unreadCount, loading,
    branding, updateBranding, uploadLogo, removeLogo,
    signInWithGoogle, submitApprovalDetails, logout, can,
    approveRequest, rejectRequest, loadPendingApprovals,
    removeUser, updateUserRole, updateUserPermissions,
    addTask, updateTask, deleteTask, addNote,
    addAnnouncement, deleteAnnouncement,
    markAnnouncementRead, markAllRead,
    addSuggestion, addReport,
    leaveRequests, requestLeave, decideLeave, cancelLeave,
    xpEvents, awardXp, mascot, triggerMascot,
    setMode, setAccent,
    toasts, pushToast, dismissToast,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

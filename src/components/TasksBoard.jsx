import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, LayoutGrid, Table2, Plus, Pencil, Trash2,
  MessageSquare, AlertTriangle, CalendarDays, User as UserIcon,
  RotateCw, Undo2,
} from "lucide-react";
import { PRIORITIES, STATUSES } from "../config/brand.js";
import { useApp } from "../store/AppContext.jsx";
import { Modal, Field, inputCls, PrimaryButton, GhostButton, DodgeButton, EmptyState, CountUp, Tilt, ConfettiBurst } from "./ui.jsx";
import { formatDate, formatDateTime, isOverdue } from "../lib/dates.js";

/* ------------------------------ badges ------------------------------ */
export function PriorityBadge({ priority }) {
  const map = {
    High: "bg-rose-500/15 text-rose-500 border-rose-500/25",
    Medium: "bg-amber-400/15 text-amber-500 border-amber-400/25",
    Low: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
  };
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${map[priority] || map.Medium}`}>
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  const label = STATUSES.find((s) => s.id === status)?.label || status;
  const map = {
    done: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
    "in-progress": "bg-blue-500/15 text-blue-500 border-blue-500/25",
    todo: "bg-slate-500/15 text-slate-400 border-slate-500/25",
  };
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${map[status] || map.todo}`}>
      {label}
    </span>
  );
}

/* ------------------------------ task editor (admin) ------------------------------ */
export function TaskEditorModal({ open, onClose, task }) {
  const { users, addTask, updateTask, theme } = useApp();
  const dark = theme.mode === "dark";
  const [form, setForm] = useState(() => ({
    project: task?.project || "",
    title: task?.title || "",
    detail: task?.detail || "",
    assigneeId: task?.assigneeId || users[0]?.id || "",
    priority: task?.priority || "Medium",
    status: task?.status || "todo",
    progress: task?.progress ?? 0,
    dueDate: task?.dueDate || "",
  }));
  const [error, setError] = useState("");

  // reset when a different task is opened
  useEffect(() => {
    if (!open) return;
    setForm({
      project: task?.project || "",
      title: task?.title || "",
      detail: task?.detail || "",
      assigneeId: task?.assigneeId || users[0]?.id || "",
      priority: task?.priority || "Medium",
      status: task?.status || "todo",
      progress: task?.progress ?? 0,
      dueDate: task?.dueDate || "",
    });
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id, open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.project.trim()) { setError("Project and title are required."); return; }
    if (task) updateTask(task.id, { ...form, progress: Number(form.progress) });
    else addTask({ ...form, progress: Number(form.progress) });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={task ? `Edit ${task.code}` : "Create Task"} wide>
      <form onSubmit={submit}>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Project"><input className={inputCls(dark)} value={form.project} onChange={set("project")} placeholder="e.g. Echoes of Silence" /></Field>
          <Field label="Title"><input className={inputCls(dark)} value={form.title} onChange={set("title")} placeholder="Task title" /></Field>
        </div>
        <Field label="Detail">
          <textarea rows={2} className={inputCls(dark)} value={form.detail} onChange={set("detail")} placeholder="What needs to be done?" />
        </Field>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Assignee">
            <select className={inputCls(dark)} value={form.assigneeId} onChange={set("assigneeId")}>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
            </select>
          </Field>
          <Field label="Due date"><input type="date" className={inputCls(dark)} value={form.dueDate} onChange={set("dueDate")} /></Field>
          <Field label="Priority">
            <select className={inputCls(dark)} value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls(dark)} value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label={`Progress — ${form.progress}%`}>
          <input type="range" min={0} max={100} value={form.progress} onChange={set("progress")} className="progress-slider w-full" />
        </Field>
        {error && <div className="mb-4 text-sm font-medium px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">{error}</div>}
        <div className="flex gap-3">
          <GhostButton onClick={onClose} className="flex-1">Cancel</GhostButton>
          <PrimaryButton type="submit" className="flex-1">{task ? "Save Changes" : "Create Task"}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------ task card ------------------------------ */
function TaskCard({ task, onEdit, onDelete, index = 0 }) {
  const { users, currentUser, updateTask, addNote, theme, can } = useApp();
  const dark = theme.mode === "dark";
  const canManageTasks = can("manageTasks");
  const [flipped, setFlipped] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const [dodged, setDodged] = useState(false);
  const [burst, setBurst] = useState(0);
  const prevProgress = useRef(task.progress);

  // premiere celebration: confetti the moment this task hits 100%
  useEffect(() => {
    if (task.progress === 100 && prevProgress.current < 100) setBurst((b) => b + 1);
    prevProgress.current = task.progress;
  }, [task.progress]);

  const assignee = users.find((u) => u.id === task.assigneeId);
  const overdue = isOverdue(task);

  const submitNote = (e) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    addNote(task.id, currentUser.id, noteText);
    setNoteText("");
  };

  return (
    <>
    <Tilt
      className={`glass rounded-3xl relative anim-rise card-lift ${overdue ? "ring-1 ring-rose-500/40" : ""}`}
      style={{ "--d": `${Math.min(index, 9) * 60}ms` }}
    >
      {burst > 0 && <ConfettiBurst key={burst} />}
      <div className="flip-inner" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
      {/* FRONT */}
      <div className="flip-face p-5 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className={`text-[11px] font-mono font-semibold ${dark ? "text-slate-500" : "text-slate-400"}`}>{task.code}</span>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {canManageTasks && (
            <>
              <button onClick={() => onEdit(task)} aria-label="Edit task"
                className={`p-1.5 rounded-lg ${dark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-500 hover:bg-slate-900/5"}`}>
                <Pencil size={14} />
              </button>
              <button onClick={() => { setDodged(false); setConfirmDel(true); }} aria-label="Delete task"
                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`text-[11px] font-bold uppercase tracking-wider accent-text mb-1`}>{task.project}</div>
      <h4 className={`font-bold leading-snug ${dark ? "text-white" : "text-slate-900"}`}>{task.title}</h4>
      {task.detail && <p className={`text-sm mt-1 line-clamp-2 ${dark ? "text-slate-400" : "text-slate-500"}`}>{task.detail}</p>}

      {/* meta row — badges never overlap the due date */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs">
        <span className={`flex items-center gap-1.5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
          <UserIcon size={13} className="accent-text" /> {assignee?.name || "Unassigned"}
        </span>
        <span className={`flex items-center gap-1.5 ${overdue ? "text-rose-500 font-semibold" : dark ? "text-slate-300" : "text-slate-600"}`}>
          <CalendarDays size={13} className={overdue ? "text-rose-500" : "accent-text"} />
          {formatDate(task.dueDate)}
        </span>
        {overdue && (
          <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25">
            <AlertTriangle size={11} /> Overdue
          </span>
        )}
        <StatusBadge status={task.status} />
      </div>

      {/* progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1.5">
          <span className={`font-semibold ${dark ? "text-slate-400" : "text-slate-500"}`}>Progress</span>
          <span className={`font-mono font-bold accent-text`}>{task.progress}%</span>
        </div>
        <input
          type="range" min={0} max={100} value={task.progress}
          onChange={(e) => updateTask(task.id, { progress: Number(e.target.value) })}
          className="progress-slider w-full"
          aria-label={`Update progress for ${task.title}`}
        />
      </div>

      {/* flip to notes */}
      <div className="mt-3">
        <button
          onClick={() => setFlipped(true)}
          className={`flex items-center gap-1.5 text-xs font-semibold ${dark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
        >
          <MessageSquare size={13} />
          {task.notes.length} note{task.notes.length === 1 ? "" : "s"}
          <RotateCw size={13} className="accent-text" />
        </button>
      </div>
      </div>{/* /FRONT */}

      {/* BACK — notes */}
      <div className="flip-face flip-back p-5 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[11px] font-mono font-semibold ${dark ? "text-slate-500" : "text-slate-400"}`}>{task.code} · Notes</span>
          <button
            onClick={() => setFlipped(false)}
            className={`flex items-center gap-1 text-xs font-semibold ${dark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"}`}
          >
            <Undo2 size={13} /> Back
          </button>
        </div>
        <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
          {task.notes.length === 0 && (
            <p className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>No notes yet — first one is yours.</p>
          )}
          {task.notes.map((n) => {
            const author = users.find((u) => u.id === n.authorId);
            return (
              <div key={n.id} className={`text-xs px-3 py-2 rounded-xl ${dark ? "bg-white/[.04]" : "bg-slate-50"}`}>
                <div className={`font-semibold ${dark ? "text-slate-200" : "text-slate-700"}`}>
                  {author?.name || "Someone"} <span className={`font-normal font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>· {formatDateTime(n.at)}</span>
                </div>
                <div className={dark ? "text-slate-300" : "text-slate-600"}>{n.text}</div>
              </div>
            );
          })}
        </div>
        <form onSubmit={submitNote} className="flex gap-2 mt-3">
          <input
            className={`${inputCls(dark)} !py-2 !text-xs`}
            placeholder="Add a note…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <button type="submit" className="accent-gradient-bg text-white text-xs font-bold px-3 rounded-xl shrink-0">Add</button>
        </form>
      </div>
      </div>{/* /flip-inner */}
    </Tilt>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title={`Delete ${task.code}?`}>
        <p className={`text-sm mb-5 ${dark ? "text-slate-300" : "text-slate-600"}`}>
          This will permanently delete “{task.title}”. This cannot be undone.
        </p>
        {dodged && (
          <p className={`text-xs mb-4 font-medium ${dark ? "text-amber-300" : "text-amber-600"}`}>
            The button ran away — chase it if you really mean it.
          </p>
        )}
        <div className="flex gap-3">
          <GhostButton onClick={() => setConfirmDel(false)} className="flex-1">Cancel</GhostButton>
          <DodgeButton
            onClick={() => { onDelete(task.id); setConfirmDel(false); }}
            onDodge={() => setDodged(true)}
            labels={["Delete", "Are you sure?", "Pakka?", "Okay — Delete"]}
            className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold px-5 py-3 rounded-2xl transition"
          >
            Delete
          </DodgeButton>
        </div>
      </Modal>
    </>
  );
}

/* ------------------------------ board ------------------------------ */
const FILTERS = [
  { id: "all", label: "All" },
  { id: "mine", label: "My Tasks" },
  { id: "urgent", label: "Urgent" }, // Urgent = High priority AND not done
];

export default function TasksBoard() {
  const { tasks, currentUser, deleteTask, theme, can } = useApp();
  const dark = theme.mode === "dark";
  const canManageTasks = can("manageTasks");

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [project, setProject] = useState("all");
  const [view, setView] = useState("cards");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const projects = useMemo(() => [...new Set(tasks.map((t) => t.project))], [tasks]);

  // Base list: search + project. Filter-tab counts are computed from THIS base,
  // so every count always equals the items actually shown.
  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (project !== "all" && t.project !== project) return false;
      if (q && !(t.title + " " + t.detail + " " + t.project + " " + t.code).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, query, project]);

  const matches = (t) => {
    if (filter === "mine") return t.assigneeId === currentUser?.id;
    if (filter === "urgent") return t.priority === "High" && t.status !== "done";
    return true;
  };
  const counts = {
    all: base.length,
    mine: base.filter((t) => t.assigneeId === currentUser?.id).length,
    urgent: base.filter((t) => t.priority === "High" && t.status !== "done").length,
  };
  const visible = base.filter(matches);

  // Stats — honest math, labels match the numbers
  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const avgProgress = total ? Math.round(tasks.reduce((s, t) => s + t.progress, 0) / total) : 0;
  const overdueCount = tasks.filter(isOverdue).length;

  const stats = [
    { label: "Total tasks", render: <CountUp value={total} /> },
    { label: "Average progress", render: <CountUp value={avgProgress} suffix="%" />, hint: "mean of all progress bars" },
    { label: "Completed", render: <><CountUp value={doneCount} /> of <CountUp value={total} /></>, hint: "tasks marked done" },
    { label: "Overdue", render: <CountUp value={overdueCount} />, tone: overdueCount > 0 ? "rose" : undefined },
  ];

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (t) => { setEditing(t); setEditorOpen(true); };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className={`text-xl font-extrabold ${dark ? "text-white" : "text-slate-900"}`}>Company-Wide Tasks & Deliverables</h2>
          <p className={`text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>Every active studio project, in one place.</p>
        </div>
        {canManageTasks && (
          <PrimaryButton onClick={openCreate} className="flex items-center gap-2">
            <Plus size={16} /> New Task
          </PrimaryButton>
        )}
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {stats.map((s, i) => (
          <Tilt
            key={s.label}
            className="glass rounded-3xl p-4 anim-rise card-lift"
            style={{ "--d": `${i * 70}ms` }}
          >
            <div className={`text-[11px] font-bold uppercase tracking-wider ${dark ? "text-slate-500" : "text-slate-400"}`}>{s.label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${s.tone === "rose" ? "text-rose-500" : dark ? "text-white" : "text-slate-900"}`}>
              {s.render}
            </div>
            {s.hint && <div className={`text-[11px] mt-0.5 ${dark ? "text-slate-500" : "text-slate-400"}`}>{s.hint}</div>}
          </Tilt>
        ))}
      </div>

      {/* toolbar */}
      <div className="glass rounded-3xl p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${dark ? "text-slate-500" : "text-slate-400"}`} />
          <input
            className={`${inputCls(dark)} !pl-10 !py-2.5`}
            placeholder="Search tasks by title, project, or code…"
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className={`${inputCls(dark)} !py-2.5 !w-auto`} value={project} onChange={(e) => setProject(e.target.value)} aria-label="Filter by project">
          <option value="all">All Projects ({tasks.length})</option>
          {projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className={`flex rounded-2xl border overflow-hidden ${dark ? "border-white/10" : "border-slate-200"}`}>
          <button onClick={() => setView("cards")} aria-label="Card view"
            className={`p-2.5 transition ${view === "cards" ? "accent-gradient-bg text-white" : dark ? "text-slate-400 hover:bg-white/5" : "text-slate-500 hover:bg-slate-900/5"}`}>
            <LayoutGrid size={16} />
          </button>
          <button onClick={() => setView("table")} aria-label="Table view"
            className={`p-2.5 transition ${view === "table" ? "accent-gradient-bg text-white" : dark ? "text-slate-400 hover:bg-white/5" : "text-slate-500 hover:bg-slate-900/5"}`}>
            <Table2 size={16} />
          </button>
        </div>
      </div>

      {/* filter tabs with honest counts */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-semibold border transition ${
              filter === f.id
                ? "accent-gradient-bg text-white border-transparent shadow"
                : dark ? "border-white/10 text-slate-300 hover:bg-white/5" : "border-slate-200 text-slate-600 hover:bg-slate-900/5"
            }`}
          >
            {f.label} <span className="font-mono opacity-80">{counts[f.id]}</span>
          </button>
        ))}
        <span className={`text-xs self-center ml-1 ${dark ? "text-slate-500" : "text-slate-400"}`}>
          Showing {visible.length} of {base.length} task{base.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* content */}
      {visible.length === 0 ? (
        <EmptyState
          icon={<Search size={24} />}
          title="No tasks match"
          body="Try a different search term or filter."
        />
      ) : view === "cards" ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visible.map((t, i) => <TaskCard key={t.id} task={t} onEdit={openEdit} onDelete={deleteTask} index={i} />)}
        </div>
      ) : (
        <TaskTable tasks={visible} onEdit={openEdit} onDelete={deleteTask} />
      )}

      <TaskEditorModal open={editorOpen} onClose={() => setEditorOpen(false)} task={editing} />
    </div>
  );
}

/* ------------------------------ table view ------------------------------ */
/* Progress bar that grows from 0 to its value on mount */
function GrowBar({ value, dark }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setW(value));
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div className={`flex-1 h-1.5 rounded-full ${dark ? "bg-white/10" : "bg-slate-200"}`}>
      <div className="h-full rounded-full accent-gradient-bg transition-[width] duration-700" style={{ width: `${w}%` }} />
    </div>
  );
}

function TaskTable({ tasks, onEdit, onDelete }) {
  const { users, currentUser, theme, can } = useApp();
  const dark = theme.mode === "dark";
  const canManageTasks = can("manageTasks");

  const th = `text-left text-[11px] font-bold uppercase tracking-wider px-4 py-3 ${dark ? "text-slate-500" : "text-slate-400"}`;
  const td = `px-4 py-3 text-sm ${dark ? "text-slate-200" : "text-slate-700"}`;

  return (
    <div className="glass rounded-3xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className={dark ? "bg-white/[.03]" : "bg-slate-50"}>
              <th className={th}>Task</th>
              <th className={th}>Project</th>
              <th className={th}>Assignee</th>
              <th className={th}>Priority</th>
              <th className={th}>Status</th>
              <th className={th}>Progress</th>
              <th className={th}>Due</th>
              {canManageTasks && <th className={th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const assignee = users.find((u) => u.id === t.assigneeId);
              const overdue = isOverdue(t);
              return (
                <tr key={t.id} className={`border-t ${dark ? "border-white/5" : "border-slate-100"}`}>
                  <td className={td}>
                    <div className="font-semibold">{t.title}</div>
                    <div className={`text-[11px] font-mono ${dark ? "text-slate-500" : "text-slate-400"}`}>{t.code}</div>
                  </td>
                  <td className={td}>{t.project}</td>
                  <td className={td}>{assignee?.name || "—"}</td>
                  <td className={td}><PriorityBadge priority={t.priority} /></td>
                  <td className={td}><StatusBadge status={t.status} /></td>
                  <td className={td}>
                    <div className="flex items-center gap-2 min-w-[110px]">
                      <GrowBar value={t.progress} dark={dark} />
                      <span className="font-mono text-xs">{t.progress}%</span>
                    </div>
                  </td>
                  <td className={td}>
                    <span className={overdue ? "text-rose-500 font-semibold" : ""}>{formatDate(t.dueDate)}</span>
                    {overdue && <div className="text-[11px] font-bold text-rose-500 mt-0.5">Overdue</div>}
                  </td>
                  {canManageTasks && (
                    <td className={td}>
                      <div className="flex gap-1">
                        <button onClick={() => onEdit(t)} aria-label="Edit" className={`p-1.5 rounded-lg ${dark ? "text-slate-400 hover:bg-white/10" : "text-slate-500 hover:bg-slate-900/5"}`}><Pencil size={14} /></button>
                        <button onClick={() => onDelete(t.id)} aria-label="Delete" className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

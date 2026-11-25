/** Date helpers — all task dates are stored as local "YYYY-MM-DD" strings. */

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

export function addDaysISO(baseISO, n) {
  const d = baseISO ? new Date(baseISO + "T00:00:00") : new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(ts) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Bucket a task's due date relative to today.
 * Returns: "done" | "overdue" | "today" | "week" | "later"
 */
export function dueBucket(task) {
  if (task.status === "done") return "done";
  const t = todayISO();
  if (!task.dueDate) return "later";
  if (task.dueDate < t) return "overdue";
  if (task.dueDate === t) return "today";
  if (task.dueDate <= addDaysISO(t, 7)) return "week";
  return "later";
}

export function isOverdue(task) {
  return dueBucket(task) === "overdue";
}

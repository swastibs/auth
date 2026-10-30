export function relativeTime(iso) {
  if (!iso) return "No date";

  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "No date";

  const diffMs = target.getTime() - Date.now();
  const absMinutes = Math.abs(diffMs) / 60000;
  const absHours = absMinutes / 60;
  const absDays = absHours / 24;

  if (absMinutes < 1) return "now";
  if (absMinutes < 60) {
    const value = Math.round(absMinutes);
    return diffMs >= 0 ? `in ${value}m` : `${value}m ago`;
  }
  if (absHours < 24) {
    const value = Math.round(absHours);
    return diffMs >= 0 ? `in ${value}h` : `${value}h ago`;
  }
  if (absDays < 7) {
    const value = Math.round(absDays);
    return diffMs >= 0 ? `in ${value}d` : `${value}d ago`;
  }

  return target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function dueTone(iso) {
  if (!iso) return "none";

  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return "none";

  const now = new Date();
  const todayAtMidnight = new Date(now);
  todayAtMidnight.setHours(0, 0, 0, 0);

  if (target < now) return "overdue";
  if (target < new Date(todayAtMidnight.getTime() + 24 * 60 * 60 * 1000)) {
    return "today";
  }
  return "future";
}

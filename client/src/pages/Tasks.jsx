import { useMemo, useState } from "react";
import { ListTodo, Plus, Search, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/shell/AppShell";
import { FocusTaskRow } from "@/components/tasks/FocusTaskRow";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/hooks/useTasks";

const statusOptions = [
  { value: "all", label: "All" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const priorityOptions = [
  { value: "all", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function TasksPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    estimatedMinutes: "",
    tags: "",
  });

  const filters = useMemo(
    () => ({
      search: search || undefined,
      status: status === "all" ? undefined : status,
      priority: priority === "all" ? undefined : priority,
      page: 1,
      limit: 50,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
    [priority, search, status],
  );

  const { tasks, stats, isLoading, error, createTask, completeTask, reopenTask, deleteTask } = useTasks(filters);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!draft.title.trim()) {
      toast.error("A task title is required.");
      return;
    }

    await createTask({
      title: draft.title.trim(),
      description: draft.description.trim(),
      priority: draft.priority,
      dueDate: draft.dueDate || undefined,
      estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : undefined,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    });

    setDraft({
      title: "",
      description: "",
      priority: "medium",
      dueDate: "",
      estimatedMinutes: "",
      tags: "",
    });
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:pt-12">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {stats ? `${stats.todo ?? 0} open · ${stats.dueToday ?? 0} today` : "Loading…"}
          </p>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <h1 className="font-heading text-3xl font-semibold sm:text-4xl">Your focus</h1>
              <p className="mt-1 text-sm text-muted-foreground">The one you do right now takes the spotlight.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
              <Sparkles className="size-3.5 text-[var(--accent-atomic)]" />
              {stats ? `${stats.done ?? 0} done today` : "Ready"}
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatPill label="Total" value={stats?.total ?? 0} />
          <StatPill label="To do" value={stats?.todo ?? 0} />
          <StatPill label="In progress" value={stats?.inProgress ?? 0} />
          <StatPill label="Due today" value={stats?.dueToday ?? 0} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="surface-card rounded-2xl p-4">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tasks…" className="pl-9" />
                </div>
                <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <select value={priority} onChange={(event) => setPriority(event.target.value)} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                Unable to load tasks.
              </div>
            ) : null}

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="A clear canvas"
                description="Every task starts as one small thing. What's next?"
                action={
                  <Button onClick={() => setDraft((current) => ({ ...current, title: "" }))}>
                    <Plus className="size-4" /> Add a task
                  </Button>
                }
              />
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <FocusTaskRow
                    key={task._id}
                    task={task}
                    expanded={expandedId === task._id}
                    onToggleExpand={() => setExpandedId((current) => (current === task._id ? null : task._id))}
                    onComplete={async (currentTask) => { await completeTask(currentTask._id); }}
                    onReopen={async (currentTask) => { await reopenTask(currentTask._id); }}
                    onDelete={async (currentTask) => { await deleteTask(currentTask._id); }}
                    busy={false}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="surface-card rounded-2xl p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="grid size-8 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--accent-atomic)_12%,transparent)] text-[var(--accent-atomic)]">
                <Plus className="size-4" />
              </div>
              <div>
                <p className="font-heading text-xl font-semibold">Quick add</p>
                <p className="text-xs text-muted-foreground">One next step, no ritualizing.</p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleCreate}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Title</label>
                <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ship onboarding copy" />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Description</label>
                <textarea rows={3} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" placeholder="What matters most here?" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Priority</label>
                  <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Estimate</label>
                  <Input type="number" min="5" step="5" value={draft.estimatedMinutes} onChange={(event) => setDraft((current) => ({ ...current, estimatedMinutes: event.target.value }))} placeholder="30" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Due date</label>
                  <Input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Tags</label>
                  <Input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} placeholder="launch, product" />
                </div>
              </div>

              <Button type="submit" className="w-full">
                <Plus className="size-4" /> Add task
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function StatPill({ label, value }) {
  return (
    <div className="surface-card rounded-xl px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

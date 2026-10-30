import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock3, PencilLine, RotateCcw, Trash2 } from "lucide-react";

import { AppShell } from "@/components/shell/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTask, useTasks } from "@/hooks/useTasks";

const formatDate = (value) => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { data: task, isLoading, isError } = useTask(taskId);
  const { updateTask, deleteTask, completeTask, reopenTask } = useTasks();

  const [draft, setDraft] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    estimatedMinutes: "",
    tags: "",
  });

  useEffect(() => {
    if (!task) return;
    setDraft({
      title: task.title ?? "",
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
      estimatedMinutes: task.estimatedMinutes ?? "",
      tags: Array.isArray(task.tags) ? task.tags.join(", ") : "",
    });
  }, [task]);

  if (isLoading) {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 text-sm text-muted-foreground sm:px-6 sm:pt-12">Loading task…</main>
      </AppShell>
    );
  }

  if (isError || !task) {
    return (
      <AppShell>
        <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
          <Card>
            <CardHeader>
              <CardTitle>Task not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">This task could not be loaded.</p>
              <Link to="/tasks">
                <Button variant="outline">Back to tasks</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </AppShell>
    );
  }

  const onSave = async () => {
    await updateTask({
      taskId,
      updates: {
        title: draft.title,
        description: draft.description,
        priority: draft.priority,
        dueDate: draft.dueDate || null,
        estimatedMinutes: draft.estimatedMinutes ? Number(draft.estimatedMinutes) : undefined,
        tags: draft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      },
    });
  };

  const onDelete = async () => {
    await deleteTask(taskId);
    navigate("/tasks");
  };

  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-4 flex items-center justify-between">
          <Link to="/tasks" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to tasks
          </Link>
          <div className="flex gap-2">
            {task.status === "done" ? (
              <Button variant="outline" size="sm" onClick={() => reopenTask(taskId)}>
                <RotateCcw className="size-3.5" />
                Reopen
              </Button>
            ) : (
              <Button size="sm" onClick={() => completeTask(taskId)}>
                <CheckCircle2 className="size-3.5" />
                Complete
              </Button>
            )}
            <Button variant="destructive" size="sm" onClick={onDelete}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>{task.title}</CardTitle>
              <CardDescription>
                <span className="font-medium capitalize">{task.status}</span> · {formatDate(task.dueDate)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                {task.description || "No description yet."}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Priority</div>
                  <div className="mt-1 font-medium capitalize">{task.priority}</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Estimate</div>
                  <div className="mt-1 font-medium">{task.estimatedMinutes ?? 0} min</div>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3">
                <div className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Tags</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {task.tags?.length ? task.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">#{tag}</span>
                  )) : <span className="text-sm text-muted-foreground">No tags</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PencilLine className="size-4" /> Edit task
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Title</label>
                <Input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Description</label>
                <textarea rows={4} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Priority</label>
                  <select value={draft.priority} onChange={(event) => setDraft((current) => ({ ...current, priority: event.target.value }))} className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Estimate (min)</label>
                  <Input type="number" min="5" step="5" value={draft.estimatedMinutes} onChange={(event) => setDraft((current) => ({ ...current, estimatedMinutes: event.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Due date</label>
                  <Input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Tags</label>
                  <Input value={draft.tags} onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))} />
                </div>
              </div>
              <Button className="w-full" onClick={onSave}>
                <Clock3 className="size-4" />
                Save updates
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}

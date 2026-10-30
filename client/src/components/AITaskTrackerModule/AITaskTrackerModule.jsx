import { useEffect, useRef, useState } from "react";
import {
  Bot,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import "./AITaskTrackerModule.css";

const STARTER_TASKS = [
  {
    id: "review",
    title: "Review the day ahead",
    due: "9:00 AM",
    priority: "High",
    duration: "15 min",
  },
  {
    id: "ship",
    title: "Ship one meaningful task",
    due: "11:30 AM",
    priority: "Focus",
    duration: "45 min",
  },
  {
    id: "lunch",
    title: "Take a proper lunch break",
    due: "1:00 PM",
    priority: "Light",
    duration: "30 min",
  },
  {
    id: "messages",
    title: "Reply to important messages",
    due: "2:30 PM",
    priority: "Light",
    duration: "20 min",
  },
  {
    id: "wrap-up",
    title: "Write tomorrow's first step",
    due: "4:30 PM",
    priority: "Focus",
    duration: "10 min",
  },
];

const PAST_DAY_TASKS = [
  {
    id: "plan",
    title: "Plan the day in one sentence",
    due: "8:45 AM",
    priority: "High",
    duration: "10 min",
  },
  {
    id: "focus",
    title: "Protect one focus block",
    due: "10:00 AM",
    priority: "Focus",
    duration: "50 min",
  },
  {
    id: "walk",
    title: "Take a short reset walk",
    due: "12:30 PM",
    priority: "Light",
    duration: "15 min",
  },
  {
    id: "close",
    title: "Close one open loop",
    due: "3:30 PM",
    priority: "Focus",
    duration: "20 min",
  },
];

const SUGGESTED_TASKS = [
  {
    id: "map-priorities",
    title: "Map the afternoon priorities",
    due: "2:00 PM",
    priority: "High",
    duration: "20 min",
  },
  {
    id: "clear-loop",
    title: "Clear your smallest open loop",
    due: "3:00 PM",
    priority: "Focus",
    duration: "25 min",
  },
  {
    id: "tomorrow-step",
    title: "Write tomorrow's first step",
    due: "4:30 PM",
    priority: "Light",
    duration: "10 min",
  },
];

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const todayKey = () => dateKey(new Date());
const parseDate = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const addDays = (key, amount) => {
  const date = parseDate(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
};
const shortDate = (key) =>
  parseDate(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const queueDate = (key) =>
  parseDate(key).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const createInitialTasks = () => {
  const today = todayKey();
  const taskState = {
    [today]: STARTER_TASKS.map((task, index) => ({
      ...task,
      done: index === 0,
    })),
  };
  for (let offset = 1; offset <= 6; offset += 1) {
    const key = addDays(today, -offset);
    taskState[key] = PAST_DAY_TASKS.map((task, index) => ({
      ...task,
      id: `${task.id}-${offset}`,
      done: (offset + index) % 3 !== 0,
    }));
  }
  return taskState;
};

export default function AITaskTrackerModule() {
  const [prompt, setPrompt] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const today = todayKey();
  const minDate = addDays(today, -6);
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasksByDate, setTasksByDate] = useState(createInitialTasks);
  const [celebrate, setCelebrate] = useState(false);
  const celebrateTimerRef = useRef(null);

  const [draggedTask, setDraggedTask] = useState(null);
  const trackerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const tasks = tasksByDate[selectedDate] || [];
  const updateTasks = (updater) => {
    setTasksByDate((current) => ({
      ...current,
      [selectedDate]: updater(current[selectedDate] || []),
    }));
  };

  useEffect(() => {
    return () => {
      if (celebrateTimerRef.current) {
        clearTimeout(celebrateTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.12 },
    );
    if (trackerRef.current) observer.observe(trackerRef.current);
    return () => observer.disconnect();
  }, []);

  const suggestTasks = (event) => {
    event.preventDefault();
    if (!prompt.trim()) return;
    const context = prompt.trim().replace(/[.!?]+$/, "");
    const createdAt = Date.now();
    updateTasks((current) => [
      ...current.filter((task) => !task.ai),
      ...SUGGESTED_TASKS.map((task, index) => ({
        ...task,
        id: `${task.id}-${createdAt}-${index}`,
        title: index === 0 ? `${task.title}: ${context}` : task.title,
        ai: true,
        done: false,
      })),
    ]);
    setPrompt("");
  };
  const addTask = (event) => {
    event.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;
    updateTasks((current) => [
      ...current,
      {
        id: `custom-${Date.now()}`,
        title,
        due: "Anytime",
        priority: "Light",
        duration: "Open",
      },
    ]);
    setNewTaskTitle("");
  };
  const toggleTask = (id) => {
    const task = tasks.find((item) => item.id === id);
    updateTasks((current) =>
      current.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item,
      ),
    );
    if (!task?.done) {
      setCelebrate(true);
      if (celebrateTimerRef.current) {
        clearTimeout(celebrateTimerRef.current);
      }
      celebrateTimerRef.current = setTimeout(() => setCelebrate(false), 700);
    }
  };
  const removeTask = (id) => {
    updateTasks((current) => current.filter((task) => task.id !== id));
  };
  const completed = tasks.filter((task) => task.done).length;
  const completionPercentage = tasks.length
    ? Math.round((completed / tasks.length) * 100)
    : 0;
  const completedBeforeNoon = tasks.filter(
    (task) => task.done && task.due.includes("AM"),
  ).length;
  const morningShare = completed
    ? Math.round((completedBeforeNoon / completed) * 100)
    : 0;
  const insightMessage =
    tasks.length === 0
      ? "A clear day leaves room for a thoughtful plan. Ask AI to create your first few tasks."
      : completionPercentage === 100
        ? "Everything on this day is complete. Carry that clarity into your next plan."
        : completed === 0
          ? "Start with the smallest task to build momentum for the rest of the day."
          : `You’ve completed ${completed} of ${tasks.length} tasks. Keep the next step small and specific.`;
  const selectDate = (key) => {
    if (key >= minDate && key <= today) setSelectedDate(key);
  };
  const monthStart = new Date(
    parseDate(selectedDate).getFullYear(),
    parseDate(selectedDate).getMonth(),
    1,
  );
  const monthEnd = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  );
  const calendarCells = [
    ...Array.from({ length: (monthStart.getDay() + 6) % 7 }, (_, index) => ({
      blank: true,
      id: `blank-${index}`,
    })),
    ...Array.from({ length: monthEnd.getDate() }, (_, index) => {
      const key = dateKey(
        new Date(monthStart.getFullYear(), monthStart.getMonth(), index + 1),
      );
      return { key, day: index + 1 };
    }),
  ];

  return (
    <section
      id="ai-tasks"
      className={`ai-section ai-scroll-reveal ${isVisible ? "is-visible" : ""}`}
      ref={trackerRef}
    >
      <div className="ai-shell">
        <div className="ai-intro">
          <span className="eyebrow">A second brain for the next move</span>
          <h2>Turn a thought into traction.</h2>
          <p>Ask for a plan, then let the day get pleasantly smaller.</p>
        </div>
        <div className="ai-tracker-card">
          <header className="ai-header">
            <div className="ai-brand">
              <span className="ai-avatar">
                <Bot size={17} />
              </span>
              <div>
                <strong>ATOMIC / AI TASKS</strong>
                <small>
                  <i /> Ready when you are
                </small>
              </div>
            </div>
            <div className="ai-header-actions">
              <span className="ai-count">
                <Zap size={14} /> {completed}/{tasks.length} complete
              </span>
              <div className="ai-date-controls">
                <button
                  type="button"
                  onClick={() => selectDate(addDays(selectedDate, -1))}
                  disabled={selectedDate === minDate}
                  aria-label="Previous day"
                >
                  <ChevronLeft size={16} />
                </button>
                <label>
                  <CalendarDays size={14} />
                  <input
                    type="date"
                    value={selectedDate}
                    min={minDate}
                    max={today}
                    onChange={(event) => selectDate(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => selectDate(addDays(selectedDate, 1))}
                  disabled={selectedDate === today}
                  aria-label="Next day"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className="ai-today-button"
                  onClick={() => setSelectedDate(today)}
                >
                  Today
                </button>
              </div>
            </div>
          </header>
          <div className="ai-content">
            <div className="ai-main-column">
              <form className="suggestion-box" onSubmit={suggestTasks}>
                <div className="suggestion-label">
                  <Sparkles size={15} /> AI suggestion box
                </div>
                <div className="suggestion-input">
                  <input
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    placeholder="Try: Plan my day"
                    aria-label="Ask AI to plan your day"
                  />
                  <button type="submit" aria-label="Generate task plan">
                    <Sparkles size={16} />
                  </button>
                </div>
                <small>Three focused tasks, shaped around your energy.</small>
              </form>
              <form className="quick-add" onSubmit={addTask}>
                <input
                  value={newTaskTitle}
                  onChange={(event) => setNewTaskTitle(event.target.value)}
                  placeholder="Add a task yourself"
                  aria-label="Add a task"
                />
                <button type="submit" aria-label="Add task">
                  <Plus size={15} />
                  Add task
                </button>
              </form>
              <div className="task-list">
                <div className="ai-panel-heading">
                  <div>
                    <span className="eyebrow">
                      {selectedDate === today ? "Today's queue" : "Daily queue"}
                    </span>
                    <h3>Make room for momentum</h3>
                  </div>
                  <span className="task-date">
                    <CalendarDays size={14} /> {queueDate(selectedDate)}
                  </span>
                </div>
                {tasks.length === 0 && (
                  <div className="empty-task-state">
                    <strong>A clear day.</strong>
                    <span>
                      Ask AI for a focused plan for {shortDate(selectedDate)}.
                    </span>
                  </div>
                )}
                {tasks.map((task) => (
                  <div
                    className={`task-row ${task.done ? "is-done" : ""} ${task.ai ? "is-ai" : ""}`}
                    key={task.id}
                    draggable
                    onDragStart={() => setDraggedTask(task.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDragEnd={() => setDraggedTask(null)}
                    onDrop={() => {
                      if (draggedTask && draggedTask !== task.id) {
                        updateTasks((current) => {
                          const from = current.findIndex(
                            (item) => item.id === draggedTask,
                          );
                          const to = current.findIndex(
                            (item) => item.id === task.id,
                          );
                          const next = [...current];
                          const [moved] = next.splice(from, 1);
                          next.splice(to, 0, moved);
                          return next;
                        });
                      }
                      setDraggedTask(null);
                    }}
                  >
                    <GripVertical className="drag-handle" size={15} />
                    <button
                      type="button"
                      className="task-check"
                      onClick={() => toggleTask(task.id)}
                      aria-label={`Mark ${task.title} complete`}
                    >
                      {task.done && <Check size={13} />}
                    </button>
                    <div className="task-copy">
                      <strong>{task.title}</strong>
                      <small>
                        <Clock3 size={12} /> {task.due} <i /> {task.duration}
                      </small>
                    </div>
                    <span
                      className={`priority priority-${task.priority.toLowerCase()}`}
                    >
                      {task.priority}
                    </span>
                    {task.ai && <Sparkles className="task-sparkle" size={13} />}
                    <button
                      type="button"
                      className="task-delete"
                      onClick={() => removeTask(task.id)}
                      aria-label={`Remove ${task.title}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <aside className="ai-side-column">
              <div className="insights-panel">
                <div className="ai-panel-heading">
                  <div>
                    <span className="eyebrow">AI insights</span>
                    <h3>A pattern worth keeping</h3>
                  </div>
                  <Bot size={18} className="insight-bot" />
                </div>
                <p>{insightMessage}</p>
                <div className="insight-meter">
                  <span style={{ width: `${completionPercentage}%` }} />
                </div>
                <small>
                  {completed
                    ? `${morningShare}% of completed tasks landed before noon.`
                    : "Complete a task to see your daily rhythm."}
                </small>
              </div>
              <div className="mini-calendar">
                <div className="mini-calendar-header">
                  <strong>
                    {monthStart.toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                  <span>Select a day</span>
                </div>
                <div className="calendar-grid">
                  {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                    <b key={`${day}-${index}`}>{day}</b>
                  ))}
                  {calendarCells.map((cell) => {
                    if (cell.blank)
                      return <span className="calendar-blank" key={cell.id} />;
                    const isSelectable =
                      cell.key >= minDate && cell.key <= today;
                    const dayTasks = tasksByDate[cell.key] || [];
                    const hasTask = dayTasks.length > 0;
                    const isComplete =
                      hasTask && dayTasks.every((task) => task.done);
                    return (
                      <button
                        type="button"
                        disabled={!isSelectable}
                        className={`${cell.key === selectedDate ? "today" : ""} ${hasTask ? "has-task" : ""} ${isComplete ? "is-complete" : ""}`}
                        key={cell.key}
                        onClick={() => selectDate(cell.key)}
                        aria-label={queueDate(cell.key)}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      {celebrate && (
        <div className="celebrate-sparkle" aria-hidden="true">
          <Sparkles size={26} />
        </div>
      )}
    </section>
  );
}

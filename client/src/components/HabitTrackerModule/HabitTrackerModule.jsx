import { useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  MousePointer2,
  Target,
  TrendingUp,
} from "lucide-react";
import "./HabitTrackerModule.css";

const HABITS = [
  { id: "move", name: "Move your body", mark: "M", detail: "20 min movement" },
  { id: "read", name: "Read", mark: "R", detail: "10 pages" },
  { id: "focus", name: "Deep focus", mark: "F", detail: "One focused block" },
  { id: "reflect", name: "Reflect", mark: "J", detail: "Write a few lines" },
];
// Change this value to control how many times the completion glow can fire per visit.
const WIN_EFFECT_LIMIT = 3;
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
const prettyDate = (key) =>
  parseDate(key).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
const shortDate = (key) =>
  parseDate(key).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
const dayName = (key) =>
  parseDate(key).toLocaleDateString(undefined, { weekday: "short" });
const createInitialState = () => {
  const today = todayKey();
  const state = {};
  for (let offset = -6; offset <= 0; offset += 1) {
    const key = addDays(today, offset);
    state[key] = {};
    HABITS.forEach((habit, index) => {
      state[key][habit.id] = index === 0 || Math.random() > 0.25;
    });
  }
  return state;
};
const progressColor = (percentage) =>
  percentage === 0
    ? "#e05252"
    : `color-mix(in oklch, var(--accent-atomic) ${percentage}%, #e05252)`;
const getDailyStats = (dates, completed) =>
  dates.map((key) => {
    const count = HABITS.filter((habit) => completed[key]?.[habit.id]).length;
    return {
      key,
      count,
      percentage: Math.round((count / HABITS.length) * 100),
    };
  });
const getStreak = (habitId, completed, start) => {
  let streak = 0;
  let cursor = start;
  while (completed[cursor]?.[habitId]) {
    streak += 1;
    cursor = addDays(cursor, -1);
    if (streak > 365) break;
  }
  return streak;
};
const heatLevels = [0, 1, 2, 3, 4];
const getHeatLevel = (key, completed) => {
  const count = HABITS.filter((habit) => completed[key]?.[habit.id]).length;
  if (count) return count;
  const seed = Number(key.replaceAll("-", ""));
  return seed % 5 === 0 ? 0 : (seed % 4) + 1;
};

function HabitRow({ habit, checked, streak, onToggle, showHint }) {
  return (
    <button
      type="button"
      className={`habit-row ${checked ? "is-complete" : ""} ${showHint ? "is-hint" : ""}`}
      onClick={() => onToggle(habit.id)}
      aria-pressed={checked}
    >
      <span className="habit-mark">
        {checked ? <Check size={15} strokeWidth={2.5} /> : habit.mark}
      </span>
      <span className="habit-copy">
        <span className="habit-name">{habit.name}</span>
        <span className="habit-detail">
          <Flame size={12} /> {streak} day{streak === 1 ? "" : "s"} streak <i />{" "}
          {habit.detail}
        </span>
      </span>
      {!checked && showHint && (
        <MousePointer2
          className="habit-hint-cursor"
          size={17}
          aria-hidden="true"
        />
      )}
      <span className="habit-status">{checked ? "Done" : "Open"}</span>
    </button>
  );
}

function DailyGraph({ stats, selectedDate, onSelect }) {
  const best = Math.max(...stats.map((item) => item.percentage));
  return (
    <div className="tracker-panel graph-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Activity rhythm</span>
          <h4>Daily completion</h4>
        </div>
        <span className="panel-kicker">
          <TrendingUp size={14} /> Best {best}%
        </span>
      </div>
      <div className="daily-chart" aria-label="Daily completion graph">
        {stats.map((item) => (
          <button
            type="button"
            className={`day-column ${item.key === selectedDate ? "selected" : ""}`}
            key={item.key}
            onClick={() => onSelect(item.key)}
          >
            <span className="chart-tooltip">
              <strong>{item.percentage}%</strong>
              <small>
                {shortDate(item.key)} · {item.count}/{HABITS.length} done
              </small>
            </span>
            <span className="bar-track">
              <span
                className={`chart-bar ${item.percentage === 100 ? "bar-perfect" : ""}`}
                style={{
                  height: `${Math.max(item.percentage, 4)}%`,
                  background: progressColor(item.percentage),
                }}
              />
            </span>
            <span className="day-label">{dayName(item.key).slice(0, 2)}</span>
            <span className="day-number">{parseDate(item.key).getDate()}</span>
          </button>
        ))}
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot danger" /> Missed
        </span>
        <span>
          <i className="legend-dot progress" /> In progress
        </span>
        <span>
          <i className="legend-dot complete" /> Complete
        </span>
      </div>
      <div className="trend-line" aria-label="Weekly trend">
        <span className="trend-label">Weekly trend</span>
        <svg viewBox="0 0 300 42" role="img" aria-label="Completion trend line">
          <polyline
            points={stats
              .map(
                (item, index) => `${index * 50},${38 - item.percentage * 0.3}`,
              )
              .join(" ")}
            fill="none"
            stroke="var(--accent-atomic)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {stats.map((item, index) => (
            <circle
              key={item.key}
              cx={index * 50}
              cy={38 - item.percentage * 0.3}
              r="3"
              fill="var(--accent-atomic)"
            />
          ))}
        </svg>
        <strong>{stats[stats.length - 1]?.percentage ?? 0}% today</strong>
      </div>
    </div>
  );
}

function StreakCalendar({ completed, today }) {
  const todayDate = parseDate(today);
  const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const monthEnd = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth() + 1,
    0,
  );
  const leadingBlanks = Array.from(
    { length: monthStart.getDay() },
    (_, index) => index,
  );
  const days = Array.from({ length: monthEnd.getDate() }, (_, index) =>
    dateKey(new Date(todayDate.getFullYear(), todayDate.getMonth(), index + 1)),
  );
  const monthLabel = monthStart.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  return (
    <div className="tracker-panel heatmap-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Consistency at a glance</span>
          <h4>{monthLabel}</h4>
        </div>
        <span className="panel-kicker">
          <Flame size={14} /> Keep the chain
        </span>
      </div>
      <div className="heatmap-weekdays" aria-hidden="true">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>
      <div className="heatmap" aria-label={`${monthLabel} completion heatmap`}>
        {leadingBlanks.map((index) => (
          <span className="heat-cell heat-cell-blank" key={`blank-${index}`} />
        ))}
        {days.map((key) => {
          const isFuture = key > today;
          const level = isFuture ? 0 : getHeatLevel(key, completed);
          return (
            <button
              type="button"
              key={key}
              disabled={isFuture}
              className={`heat-cell level-${level} ${isFuture ? "is-future" : ""}`}
              title={
                isFuture
                  ? `${shortDate(key)} — upcoming`
                  : `${shortDate(key)} activity`
              }
              aria-label={
                isFuture
                  ? `${shortDate(key)}, upcoming`
                  : `${shortDate(key)} activity`
              }
            />
          );
        })}
      </div>
      <div className="heatmap-key">
        <span>Less</span>
        {heatLevels.map((level) => (
          <i className={`heat-cell level-${level}`} key={level} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function HabitGraph({ dates, completed }) {
  const rows = HABITS.map((habit) => {
    const count = dates.filter((key) => completed[key]?.[habit.id]).length;
    return {
      habit,
      count,
      percentage: Math.round((count / dates.length) * 100),
    };
  });
  return (
    <div className="tracker-panel graph-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Consistency signal</span>
          <h4>Habit-wise weekly report</h4>
        </div>
        <span className="panel-kicker">
          <Award size={14} /> 7 day view
        </span>
      </div>
      <div className="habit-report">
        {rows.map(({ habit, count, percentage }) => (
          <div className="report-row" key={habit.id}>
            <div className="report-label">
              <span className="habit-report-mark">{habit.mark}</span>
              <span>{habit.name}</span>
            </div>
            <div className="report-track">
              <span
                style={{
                  width: `${percentage}%`,
                  background: progressColor(percentage),
                }}
              />
            </div>
            <strong>{percentage}%</strong>
            <small>{count}/7</small>
          </div>
        ))}
      </div>
      <div className="report-note">
        <Target size={14} /> Every small repeat compounds into a stronger week.
      </div>
    </div>
  );
}

export default function HabitTrackerModule() {
  const today = todayKey();
  const minDate = addDays(today, -6);
  const [selectedDate, setSelectedDate] = useState(today);
  const [completed, setCompleted] = useState(createInitialState);
  const [viewMode, setViewMode] = useState("daily");
  const [showHint, setShowHint] = useState(false);
  const [winPulseKey, setWinPulseKey] = useState(0);
  const trackerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const winCountRef = useRef(0);
  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        addDays(selectedDate, -(6 - index)),
      ),
    [selectedDate],
  );
  const dailyStats = useMemo(
    () => getDailyStats(dates, completed),
    [dates, completed],
  );
  const selectedData = completed[selectedDate] || {};
  const completedCount = HABITS.filter(
    (habit) => selectedData[habit.id],
  ).length;
  const percentage = Math.round((completedCount / HABITS.length) * 100);
  const weeklyTotal = dailyStats.reduce((sum, item) => sum + item.count, 0);
  const weeklyPercentage = Math.round(
    (weeklyTotal / (HABITS.length * dates.length)) * 100,
  );
  const bestStreak = Math.max(
    ...HABITS.map((habit) => getStreak(habit.id, completed, selectedDate)),
  );
  const firstUnchecked = HABITS.find((habit) => !selectedData[habit.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowHint(true), 12000);
    return () => window.clearTimeout(timer);
  }, [selectedDate, firstUnchecked?.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.12 },
    );
    if (trackerRef.current) observer.observe(trackerRef.current);
    return () => observer.disconnect();
  }, []);
  const toggleHabit = (habitId) => {
    const completesDay = HABITS.every(
      (habit) => habit.id === habitId || selectedData[habit.id],
    );
    setCompleted((previous) => ({
      ...previous,
      [selectedDate]: {
        ...(previous[selectedDate] || {}),
        [habitId]: !previous[selectedDate]?.[habitId],
      },
    }));
    setShowHint(false);
    if (
      completesDay &&
      !selectedData[habitId] &&
      winCountRef.current < WIN_EFFECT_LIMIT
    ) {
      winCountRef.current += 1;
      setWinPulseKey((key) => key + 1);
    }
  };
  const selectDate = (key) => {
    if (key >= minDate && key <= today) {
      setShowHint(false);
      setSelectedDate(key);
    }
  };
  const message =
    percentage === 0
      ? "Don't break your streak"
      : percentage === 100
        ? "Perfect day. Keep the signal strong"
        : percentage < 50
          ? `Keep it up. ${HABITS.length - completedCount} more to go`
          : "You're building real momentum";
  const streakText =
    bestStreak > 0 ? `${bestStreak} day streak` : "Start a streak today";
  const averages = HABITS.map((habit) => ({
    ...habit,
    percentage: Math.round(
      (dates.filter((key) => completed[key]?.[habit.id]).length /
        dates.length) *
        100,
    ),
  }));
  const mostImproved = [...averages].sort(
    (a, b) => b.percentage - a.percentage,
  )[0];
  const quote =
    bestStreak >= 21
      ? "Consistency is becoming part of who you are."
      : percentage === 100
        ? "A perfect day is proof that the system works."
        : "Small enough to start. Strong enough to compound.";

  return (
    <section
      id="habits"
      className={`habit-section scroll-reveal ${isVisible ? "is-visible" : ""}`}
      ref={trackerRef}
    >
      <div className="habit-shell">
        <div className="habit-intro">
          <span className="eyebrow">A calmer way to stay consistent</span>
          <h2>Make progress visible.</h2>
          <p>
            A focused weekly view for the habits that move your day forward.
          </p>
        </div>
        <div className="tracker-card">
          <header className="tracker-header">
            <div>
              <div className="brand-line">
                <span className="brand-dot" /> ATOMIC / HABITS
              </div>
              <p>Personal rhythm dashboard</p>
            </div>
            <div className="date-controls">
              <button
                type="button"
                onClick={() => selectDate(addDays(selectedDate, -1))}
                disabled={selectedDate === minDate}
                aria-label="Previous day"
              >
                <ChevronLeft size={17} />
              </button>
              <label>
                <CalendarDays size={15} />
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
                <ChevronRight size={17} />
              </button>
              <button
                type="button"
                className="today-button"
                onClick={() => setSelectedDate(today)}
              >
                Today
              </button>
            </div>
          </header>
          <div className="tracker-content">
            <div className="habit-column">
              <div className="section-top">
                <div>
                  <span className="eyebrow">{prettyDate(selectedDate)}</span>
                  <h3>
                    {completedCount} <span>/ {HABITS.length} complete</span>
                  </h3>
                  <p
                    className="status-message"
                    style={{ color: progressColor(percentage) }}
                  >
                    {message}
                  </p>
                </div>
                <div
                  key={winPulseKey}
                  className={`completion-gauge ${percentage === 100 && winPulseKey ? "ring-win" : ""}`}
                  style={{ "--gauge-color": progressColor(percentage) }}
                >
                  <svg
                    className="gauge-svg"
                    viewBox="0 0 200 116"
                    role="img"
                    aria-label={`${percentage}% complete today`}
                  >
                    <path
                      className="gauge-track"
                      d="M 16 98 A 84 84 0 0 1 184 98"
                    />
                    <path
                      className="gauge-progress"
                      d="M 16 98 A 84 84 0 0 1 184 98"
                      style={{ "--gauge-offset": 264 - percentage * 2.64 }}
                    />
                    {percentage > 0 && (
                      <circle
                        className="gauge-endpoint"
                        cx={100 - 84 * Math.cos(Math.PI * (percentage / 100))}
                        cy={98 - 84 * Math.sin(Math.PI * (percentage / 100))}
                        r="4"
                      />
                    )}
                  </svg>
                  <div className="gauge-value">
                    <strong>
                      {percentage}
                      <small>%</small>
                    </strong>
                    <span>today</span>
                  </div>
                </div>
              </div>
              <div className="progress-line">
                <span
                  style={{
                    width: `${percentage}%`,
                    background: progressColor(percentage),
                  }}
                />
              </div>
              <div className="habit-list">
                {HABITS.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    checked={Boolean(selectedData[habit.id])}
                    streak={getStreak(habit.id, completed, selectedDate)}
                    onToggle={toggleHabit}
                    showHint={showHint && firstUnchecked?.id === habit.id}
                  />
                ))}
              </div>
              <div className="interaction-note">
                <MousePointer2 size={14} /> Tap a habit row to update your day
              </div>
              <div className="habit-column-footer">
                <div>
                  <span className="eyebrow">Daily focus</span>
                  <strong>
                    {firstUnchecked
                      ? `Next up: ${firstUnchecked.name}`
                      : "All habits are complete"}
                  </strong>
                </div>
                <span className="focus-score">
                  {weeklyPercentage}%<small> this week</small>
                </span>
              </div>
              <StreakCalendar completed={completed} today={today} />
            </div>
            <div className="insight-column">
              <div className="view-switcher">
                <button
                  type="button"
                  className={viewMode === "daily" ? "active" : ""}
                  onClick={() => setViewMode("daily")}
                >
                  <BarChart3 size={15} /> Daily rhythm
                </button>
                <button
                  type="button"
                  className={viewMode === "habit" ? "active" : ""}
                  onClick={() => setViewMode("habit")}
                >
                  <Target size={15} /> Weekly by habit
                </button>
              </div>
              {viewMode === "daily" ? (
                <DailyGraph
                  stats={dailyStats}
                  selectedDate={selectedDate}
                  onSelect={selectDate}
                />
              ) : (
                <HabitGraph dates={dates} completed={completed} />
              )}
              <div className="stats-grid">
                <div className="stat-card">
                  <Flame size={16} />
                  <span>Best streak</span>
                  <strong>{bestStreak}</strong>
                  <small>{streakText}</small>
                </div>
                <div className="stat-card">
                  <TrendingUp size={16} />
                  <span>Weekly completion</span>
                  <strong>{weeklyPercentage}%</strong>
                  <small>Across all habits</small>
                </div>
                <div className="stat-card">
                  <Sparkles size={16} />
                  <span>Best week</span>
                  <strong>{Math.max(weeklyPercentage, 86)}%</strong>
                  <small>Last 7 days</small>
                </div>
              </div>
              <div className="habit-summary-grid">
                <div className="summary-card challenge-card">
                  <span className="eyebrow">Today&apos;s challenge</span>
                  <strong>Finish one habit before noon.</strong>
                  <small>Early wins make the rest feel lighter.</small>
                </div>
                <div className="summary-card">
                  <span className="eyebrow">Monthly snapshot</span>
                  <strong>{Math.max(weeklyPercentage, 74)}% rhythm</strong>
                  <small>Most improved: {mostImproved.name}</small>
                  <blockquote>&quot;{quote}&quot;</blockquote>
                </div>
              </div>
              <div className="milestone-row">
                <Target size={15} />
                <span>
                  Your next milestone:{" "}
                  <strong>
                    {Math.max(30 - bestStreak, 1)} days to a 30-day forecast
                  </strong>
                </span>
                <span className="people-count">
                  1,247 tracking habits right now
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

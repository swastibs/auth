import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

import { HabitFrequency } from "./habits.constants.js";

export interface IHabit {
  userId: mongoose.Types.ObjectId;

  name: string;
  description?: string;

  frequency: HabitFrequency;
  recurrence?: string;
  targetCount?: number;
  targetDays?: number[];

  reminderTime?: string;
  color?: string;
  icon?: string;

  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  lastCompletionDate?: Date;

  archivedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type HabitDocument = HydratedDocument<IHabit>;
export type HabitModel = Model<IHabit>;

const HabitSchema = new Schema<IHabit, HabitModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 2000 },

    frequency: {
      type: String,
      enum: Object.values(HabitFrequency),
      default: HabitFrequency.DAILY,
      required: true,
    },
    recurrence: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "RRULE:FREQ=DAILY;INTERVAL=1",
    },
    targetCount: { type: Number, min: 1, max: 7 },
    targetDays: {
      type: [Number],
      default: undefined,
      validate: {
        validator: (value: number[] | undefined) =>
          !value || value.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: "targetDays must be integers between 0 and 6",
      },
    },

    reminderTime: { type: String },
    color: { type: String },
    icon: { type: String, maxlength: 50 },

    currentStreak: { type: Number, default: 0, min: 0 },
    longestStreak: { type: Number, default: 0, min: 0 },
    totalCompletions: { type: Number, default: 0, min: 0 },
    lastCompletionDate: { type: Date },

    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        const habit = ret as Record<string, unknown>;
        delete habit.__v;
        return ret;
      },
    },
  },
);

/* ── Conditional validation: exactly one of targetCount / targetDays ─── */
HabitSchema.pre("validate", function () {
  if (this.frequency === HabitFrequency.WEEKLY) {
    if (this.targetCount === undefined) {
      this.invalidate("targetCount", "Weekly habits require a targetCount (1-7)");
    }
    if (this.targetDays !== undefined) {
      this.invalidate("targetDays", "targetDays is not allowed for weekly habits");
    }
    if (!this.recurrence) {
      this.recurrence = "RRULE:FREQ=WEEKLY;INTERVAL=1";
    }
  } else if (this.frequency === HabitFrequency.CUSTOM) {
    if (!this.targetDays || this.targetDays.length === 0) {
      this.invalidate("targetDays", "Custom habits require at least one targetDay");
    }
    if (this.targetCount !== undefined) {
      this.invalidate("targetCount", "targetCount is not allowed for custom habits");
    }
    if (!this.recurrence) {
      this.recurrence = "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR,SA,SU;INTERVAL=1";
    }
  } else if (this.frequency === HabitFrequency.DAILY) {
    if (this.targetCount !== undefined || this.targetDays !== undefined) {
      this.invalidate("frequency", "Daily habits do not accept targetCount or targetDays");
    }
    if (!this.recurrence) {
      this.recurrence = "RRULE:FREQ=DAILY;INTERVAL=1";
    }
  }
});

/* ── Indexes ─────────────────────────────────────────────────────────── */
HabitSchema.index({ userId: 1, deletedAt: 1, archivedAt: 1, createdAt: -1 });
HabitSchema.index({ userId: 1, frequency: 1 });

/* ── Export ──────────────────────────────────────────────────────────── */
const Habit: HabitModel =
  (mongoose.models.Habit as HabitModel) ??
  mongoose.model<IHabit, HabitModel>("Habit", HabitSchema);

export default Habit;

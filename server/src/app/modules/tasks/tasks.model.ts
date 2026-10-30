import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

import { TaskPriority, TaskStatus } from "./tasks.constants.js";

export interface ITask {
  userId: mongoose.Types.ObjectId;

  title: string;
  description?: string;

  status: TaskStatus;
  priority: TaskPriority;

  dueDate?: Date;
  completedAt?: Date;
  estimatedMinutes?: number;
  recurrence?: string;
  parentTaskId?: mongoose.Types.ObjectId;
  subtasks?: mongoose.Types.ObjectId[];
  totalFocusTime?: number;

  tags: string[];

  // Meta
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskDocument = HydratedDocument<ITask>;
export type TaskModel = Model<ITask>;

const TaskSchema = new Schema<ITask, TaskModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
    },

    dueDate: { type: Date, index: true },
    completedAt: { type: Date },
    estimatedMinutes: { type: Number, min: 1, max: 1440 },
    recurrence: { type: String, trim: true, maxlength: 500 },
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task", index: true },
    subtasks: [{ type: Schema.Types.ObjectId, ref: "Task", default: [] }],
    totalFocusTime: { type: Number, default: 0, min: 0, max: 10080 },

    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (value: string[]) => value.length <= 10,
        message: "A task can have at most 10 tags",
      },
    },

    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        const task = ret as Record<string, unknown>;
        delete task.__v;
        return ret;
      },
    },
  },
);

/* ────────────────────────── Indexes ─────────────────────────────────── */

// Primary query: "my tasks, filtered by status, sorted by due date"
TaskSchema.index({ userId: 1, status: 1, dueDate: 1, deletedAt: 1 });
TaskSchema.index({ userId: 1, priority: -1, createdAt: -1 });
TaskSchema.index({ userId: 1, tags: 1 });

/* ────────────────────────── Export ──────────────────────────────────── */

const Task: TaskModel =
  (mongoose.models.Task as TaskModel) ??
  mongoose.model<ITask, TaskModel>("Task", TaskSchema);

export default Task;

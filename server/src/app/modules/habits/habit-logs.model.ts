import mongoose, { Schema, type HydratedDocument, type Model } from "mongoose";

export interface IHabitLog {
  habitId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  dateKey: string;
  note?: string;
  createdAt: Date;
}

export type HabitLogDocument = HydratedDocument<IHabitLog>;
export type HabitLogModel = Model<IHabitLog>;

const HabitLogSchema = new Schema<IHabitLog, HabitLogModel>(
  {
    habitId: {
      type: Schema.Types.ObjectId,
      ref: "Habit",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "dateKey must be YYYY-MM-DD"],
    },
    note: { type: String, trim: true, maxlength: 500 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

HabitLogSchema.index({ habitId: 1, dateKey: 1 }, { unique: true });
HabitLogSchema.index({ habitId: 1, dateKey: -1 });
HabitLogSchema.index({ userId: 1, dateKey: -1 });

const HabitLog: HabitLogModel =
  (mongoose.models.HabitLog as HabitLogModel) ??
  mongoose.model<IHabitLog, HabitLogModel>("HabitLog", HabitLogSchema);

export default HabitLog;

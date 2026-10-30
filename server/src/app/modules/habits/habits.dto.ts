import Joi from "joi";

import BaseDto from "../../shared/dto/base.dto.js";
import {
  HABIT_COLOR_REGEX,
  HABIT_REMINDER_TIME_REGEX,
  HabitFrequency,
  MAX_HABIT_DESCRIPTION_LENGTH,
  MAX_HABIT_NAME_LENGTH,
} from "./habits.constants.js";

const nameSchema = Joi.string().trim().min(1).max(MAX_HABIT_NAME_LENGTH);
const descriptionSchema = Joi.string()
  .trim()
  .max(MAX_HABIT_DESCRIPTION_LENGTH)
  .allow("");
const frequencySchema = Joi.string().valid(...Object.values(HabitFrequency));
const recurrenceSchema = Joi.string().trim().max(500).pattern(/^RRULE:/i);
const targetCountSchema = Joi.number().integer().min(1).max(7);
const targetDaysSchema = Joi.array()
  .items(Joi.number().integer().min(0).max(6))
  .min(1)
  .max(7)
  .unique()
  .sort({ order: "ascending" });
const reminderTimeSchema = Joi.string().pattern(HABIT_REMINDER_TIME_REGEX);
const colorSchema = Joi.string().pattern(HABIT_COLOR_REGEX);
const iconSchema = Joi.string().trim().max(50);

export const createHabitSchema = Joi.object({
  name: nameSchema.required(),
  description: descriptionSchema,
  frequency: frequencySchema.default(HabitFrequency.DAILY),
  recurrence: recurrenceSchema,
  targetCount: targetCountSchema.when("frequency", {
    is: HabitFrequency.WEEKLY,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  targetDays: targetDaysSchema.when("frequency", {
    is: HabitFrequency.CUSTOM,
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  reminderTime: reminderTimeSchema,
  color: colorSchema,
  icon: iconSchema,
});

export class CreateHabitDto extends BaseDto {
  static override readonly schema = createHabitSchema;
}

export const updateHabitSchema = Joi.object({
  name: nameSchema,
  description: descriptionSchema,
  frequency: frequencySchema,
  recurrence: recurrenceSchema.allow(null),
  targetCount: targetCountSchema,
  targetDays: targetDaysSchema,
  reminderTime: reminderTimeSchema.allow(null),
  color: colorSchema.allow(null),
  icon: iconSchema.allow(null),
  archived: Joi.boolean(),
}).min(1);

export class UpdateHabitDto extends BaseDto {
  static override readonly schema = updateHabitSchema;
}

export const checkInHabitSchema = Joi.object({
  note: Joi.string().trim().max(500).allow(""),
});

export class CheckInHabitDto extends BaseDto {
  static override readonly schema = checkInHabitSchema;
}

export const listHabitsSchema = Joi.object({
  frequency: frequencySchema,
  archived: Joi.boolean().default(false),
  search: Joi.string().trim().min(1).max(100),
  sortBy: Joi.string()
    .valid("createdAt", "name", "currentStreak", "totalCompletions")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export class ListHabitsDto extends BaseDto {
  static override readonly schema = listHabitsSchema;
}

import Joi, { type ObjectSchema, type ValidationResult } from "joi";

class BaseDto {
  static readonly schema: ObjectSchema = Joi.object({});

  static validate(data: unknown): {
    errors: string[] | null;
    value: unknown;
  } {
    const { error, value }: ValidationResult = this.schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return {
        errors: error.details.map((detail) => detail.message),
        value: null,
      };
    }

    return { errors: null, value };
  }
}

export default BaseDto;

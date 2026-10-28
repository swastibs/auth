import type { Request, Response, NextFunction } from "express";
import type BaseDto from "../dto/baseDto.js";
import ApiError from "../utils/apiError.js";

const validate = (DtoClass: typeof BaseDto) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { errors, value } = DtoClass.validate(req.body);

    if (errors) {
      return next(ApiError.badRequest(errors.join(", ")));
    }

    req.body = value;
    return next();
  };
};

export default validate;

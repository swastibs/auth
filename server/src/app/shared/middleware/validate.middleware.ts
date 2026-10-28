import type { Request, Response, NextFunction } from "express";
import type BaseDto from "../dto/base.dto.js";
import ApiError from "../utils/api-error.util.js";

const validate = (DtoClass: typeof BaseDto) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const { errors, value } = DtoClass.validate(req.body);

    if (errors) return next(new ApiError(400, errors.join(", ")));

    req.body = value;
    return next();
  };
};

export default validate;

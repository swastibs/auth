import { type Response } from "express";

class ApiResponse {
  static send(
    res: Response,
    statusCode: number,
    message: string,
    data: unknown = null,
  ) {
    return res.status(statusCode).json({
      status: statusCode,
      success: statusCode < 400,
      message,
      data,
    });
  }

  static ok(res: Response, message = "OK", data: unknown = null) {
    return ApiResponse.send(res, 200, message, data);
  }

  static created(res: Response, message = "Created", data: unknown = null) {
    return ApiResponse.send(res, 201, message, data);
  }

  static accepted(res: Response, message = "Accepted", data: unknown = null) {
    return ApiResponse.send(res, 202, message, data);
  }

  static noContent(res: Response) {
    return res.status(204).send();
  }
}

export default ApiResponse;

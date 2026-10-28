class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  // 400s — client errors
  static badRequest(message = "Bad Request"): never {
    throw new ApiError(400, message);
  }
  static unauthorized(message = "Unauthorized"): never {
    throw new ApiError(401, message);
  }
  static forbidden(message = "Forbidden"): never {
    throw new ApiError(403, message);
  }
  static notFound(message = "Not Found"): never {
    throw new ApiError(404, message);
  }
  static methodNotAllowed(message = "Method Not Allowed"): never {
    throw new ApiError(405, message);
  }
  static conflict(message = "Conflict"): never {
    throw new ApiError(409, message);
  }
  static gone(message = "Gone"): never {
    throw new ApiError(410, message);
  }
  static payloadTooLarge(message = "Payload Too Large"): never {
    throw new ApiError(413, message);
  }
  static unsupportedMediaType(message = "Unsupported Media Type"): never {
    throw new ApiError(415, message);
  }
  static unprocessableEntity(message = "Unprocessable Entity"): never {
    throw new ApiError(422, message);
  }
  static tooManyRequests(message = "Too Many Requests"): never {
    throw new ApiError(429, message);
  }

  // 500s — server errors
  static internal(message = "Internal Server Error"): never {
    throw new ApiError(500, message);
  }
  static notImplemented(message = "Not Implemented"): never {
    throw new ApiError(501, message);
  }
  static badGateway(message = "Bad Gateway"): never {
    throw new ApiError(502, message);
  }
  static serviceUnavailable(message = "Service Unavailable"): never {
    throw new ApiError(503, message);
  }
  static gatewayTimeout(message = "Gateway Timeout"): never {
    throw new ApiError(504, message);
  }
}

export default ApiError;

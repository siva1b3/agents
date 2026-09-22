export class ApplicationError extends Error {
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApplicationError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

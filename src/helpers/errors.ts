export class CLIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CLIError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CLIError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

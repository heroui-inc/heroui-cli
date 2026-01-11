export class CLIError extends Error {
  constructor(
    message: string,
    public exitCode = 1
  ) {
    super(message);
    this.name = 'CLIError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CLIError {
  constructor(message: string) {
    super(message, 1);
    this.name = 'ValidationError';
  }
}

export class FileNotFoundError extends CLIError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 1);
    this.name = 'FileNotFoundError';
  }
}

export class ComponentNotFoundError extends CLIError {
  constructor(componentName: string, suggestion?: string) {
    const message = suggestion
      ? `Component '${componentName}' not found. Did you mean '${suggestion}'?`
      : `Component '${componentName}' not found`;

    super(message, 1);
    this.name = 'ComponentNotFoundError';
  }
}

export class DependencyError extends CLIError {
  constructor(message: string) {
    super(message, 1);
    this.name = 'DependencyError';
  }
}

/* eslint-disable no-console */
export function handleError(error: unknown): never {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
    process.exit(error.exitCode);
  }

  if (error instanceof Error) {
    console.error(`Unexpected error: ${error.message}`);
    console.error(error.stack);
  } else {
    console.error('An unknown error occurred');
  }

  process.exit(1);
}
/* eslint-enable no-console */

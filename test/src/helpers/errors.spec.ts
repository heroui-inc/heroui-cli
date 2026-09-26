import {CLIError, ValidationError} from '@helpers/errors';
import {describe, expect, it} from 'vitest';

describe('errors', () => {
  it('names CLI and validation errors', () => {
    const cliError = new CLIError('failed');
    const validationError = new ValidationError('invalid');

    expect(cliError).toBeInstanceOf(Error);
    expect(cliError.name).toBe('CLIError');
    expect(cliError.message).toBe('failed');
    expect(validationError).toBeInstanceOf(CLIError);
    expect(validationError.name).toBe('ValidationError');
  });
});

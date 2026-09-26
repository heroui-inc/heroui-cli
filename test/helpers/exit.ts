import {vi} from 'vitest';

export class ExitError extends Error {
  code: number | string | null | undefined;

  constructor(code?: number | string | null) {
    super(`process.exit ${code}`);
    this.name = 'ExitError';
    this.code = code;
  }
}

export function installExitMock() {
  return vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null) => {
    throw new ExitError(code);
  }) as typeof process.exit);
}

import {vi} from 'vitest';

export function captureStdout() {
  const chunks: string[] = [];

  vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));

    return true;
  }) as typeof process.stdout.write);

  return () => chunks.join('');
}

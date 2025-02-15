import {tryLintFile} from '../lint';
import {affectedFiles} from '../store';

export async function lintAffectedFiles() {
  try {
    await tryLintFile(Array.from(affectedFiles));
  } catch (error) {
    return;
  }
}

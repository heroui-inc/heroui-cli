import {
  HEROUI_PLUGIN,
  HEROUI_PREFIX,
  NEXTUI_PLUGIN,
  NEXTUI_PREFIX
} from '../../../constants/prefix';
import {getStore, updateAffectedFiles, writeFileAndUpdateStore} from '../../store';

export function migrateLeftFiles(files: string[]) {
  for (const file of files) {
    const rawContent = getStore(file, 'rawContent');
    const replaceContent = rawContent
      .replaceAll(NEXTUI_PREFIX, HEROUI_PREFIX)
      .replaceAll(NEXTUI_PLUGIN, HEROUI_PLUGIN);

    writeFileAndUpdateStore(file, 'rawContent', replaceContent);
    updateAffectedFiles(file);
  }
}

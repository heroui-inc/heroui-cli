import {HEROUI_CSS_VARIABLES_PREFIX, NEXTUI_CSS_VARIABLES_PREFIX} from '../../../constants/prefix';
import {getStore, updateAffectedFiles, writeFileAndUpdateStore} from '../../store';

export function migrateCssVariables(files: string[]) {
  for (const file of files) {
    const rawContent = getStore(file, 'rawContent');
    const dirtyFlag = rawContent.includes(NEXTUI_CSS_VARIABLES_PREFIX);

    if (dirtyFlag) {
      const content = rawContent.replaceAll(
        NEXTUI_CSS_VARIABLES_PREFIX,
        HEROUI_CSS_VARIABLES_PREFIX
      );

      writeFileAndUpdateStore(file, 'rawContent', content);
      updateAffectedFiles(file);
    }
  }
}

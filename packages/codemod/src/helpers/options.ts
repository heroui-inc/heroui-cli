export const CODEMOD_OPTIONS = {
  format: false
};

export function initOptions(options: {format: boolean}) {
  const {format} = options;

  setOptionsValue('format', format);
}

export function setOptionsValue(key: keyof typeof CODEMOD_OPTIONS, value: boolean) {
  CODEMOD_OPTIONS[key] = value;
}

export function getOptionsValue<T extends keyof typeof CODEMOD_OPTIONS>(key: T) {
  return CODEMOD_OPTIONS[key];
}

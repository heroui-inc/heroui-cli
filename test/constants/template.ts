interface PkgTemplate {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function getPkgTemplate(options: PkgTemplate = {}) {
  return JSON.stringify(
    {
      dependencies: {
        ...options.dependencies
      },
      devDependencies: {
        ...options.devDependencies
      },
      license: 'MIT',
      name: 'heroui-cli-pkg-template',
      private: false,
      type: 'module',
      version: '1.0.0'
    },
    null,
    2
  );
}

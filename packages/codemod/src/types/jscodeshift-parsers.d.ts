/**
 * `jscodeshift` ships these parser entry points but @types/jscodeshift does not
 * declare them, so they are typed here rather than disabling noImplicitAny.
 */
declare module 'jscodeshift/parser/babylon' {
  import type {Parser} from 'jscodeshift';

  const babylonParse: (options?: Record<string, unknown>) => Parser;

  export default babylonParse;
}

declare module 'jscodeshift/parser/tsOptions' {
  const tsOptions: {plugins: unknown[]} & Record<string, unknown>;

  export default tsOptions;
}

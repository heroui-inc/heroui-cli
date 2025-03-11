import c from 'chalk';
import {MultiBar, Presets, SingleBar} from 'cli-progress';

export function createSingleProgressBar() {
  return new SingleBar(
    {
      barsize: 40,
      clearOnComplete: true,
      format: `${c.green('{head}')} ${c.green('{bar}')} | {percentage}% || {value}/{total} || time: {duration}s | ${c.gray('{name}')}`,
      hideCursor: true,
      linewrap: false
    },
    Presets.shades_classic
  );
}

export function createMultiProgressBar() {
  return new MultiBar(
    {
      barsize: 40,
      clearOnComplete: true,
      format: `${c.green('{head}')} ${c.green('{bar}')} | {percentage}% || {value}/{total} || time: {duration}s | ${c.gray('{name}')}`,
      hideCursor: true,
      linewrap: false
    },
    Presets.shades_classic
  );
}

import type {ChalkColor, CommandName} from './type';

import chalk from 'chalk';

import {boxRound} from 'src/constants/box';
import {
  type HeroUIComponent,
  type HeroUIComponents,
  colorHeroUIComponentKeys,
  orderHeroUIComponentKeys
} from 'src/constants/component';

import {Logger} from './logger';
import {PasCalCase, fillAnsiLength, strip} from './utils';

// eslint-disable-next-line no-control-regex
export const colorMatchRegex = /\u001b\[[\d;]+m/g;

const rounded = boxRound.round;
const space = '   ';
const padStart = `${rounded.vertical}${space}`;
const padEnd = `${space}${rounded.vertical}${space}`;
const versionRegex = /([\W\w]+)\snew:/;
const newVersionRegex = /new:\s([\W\w]+)/;

/**
 * Output the components information e.g. status, description, version, etc.
 * @param components
 * @param commandName
 * @param warnError
 */
export function outputComponents({
  commandName,
  components,
  message = 'Current installed components:\n',
  warnError = true
}: {
  components: HeroUIComponents;
  commandName?: CommandName;
  warnError?: boolean;
  message?: string;
}) {
  if (!components.length) {
    if (warnError) {
      Logger.prefix('warn', 'No components found');
    }

    return;
  }

  const componentKeyLengthMap: Record<keyof HeroUIComponent | 'originVersion', number> = {
    description: 0,
    docs: 0,
    name: 0,
    originVersion: 0,
    package: 0,
    peerDependencies: 0,
    status: 0,
    style: 0,
    version: 0
  };

  for (const component of components) {
    for (const key in component) {
      const str = String(component[key]);

      if (key === 'version') {
        const newVersion = str.match(newVersionRegex)?.[1];
        const currentVersion = str.match(versionRegex)?.[1];

        const value = strip(generateComponentOutputVersion(currentVersion!, newVersion!));

        // Align the length of the version
        componentKeyLengthMap[key] = Math.max(
          componentKeyLengthMap[key],
          Math.max(value.length, 'version'.length)
        );
        // Record origin version length
        componentKeyLengthMap.originVersion = Math.max(
          componentKeyLengthMap.originVersion,
          currentVersion!.length
        );

        continue;
      }

      componentKeyLengthMap[key] = Math.max(componentKeyLengthMap[key], str.length);
    }
  }

  let transformComponentsOutput = components.reduce((acc, component) => {
    let outputData = padStart;

    for (const key of orderHeroUIComponentKeys) {
      let value = fillAnsiLength(component[key], componentKeyLengthMap[key]);

      /** ======================== Replace version to new version ======================== */
      if (commandName !== 'list' && key === 'version') {
        // Filter list command cause it will list all the latest components
        const currentVersion = value.match(versionRegex)?.[1]?.trim();
        const newVersion = value.match(newVersionRegex)?.[1]?.trim();

        if (currentVersion === newVersion) {
          value = value.replace(/\snew:\s[\W\w]+(\s+)?/, '');
          value = fillAnsiLength(
            `${fillAnsiLength(value, componentKeyLengthMap.originVersion)} 🚀latest`,
            componentKeyLengthMap[key]
          );
          value = value.replace('latest', chalk.magentaBright.underline('latest'));
        } else if (newVersion) {
          value = fillAnsiLength(
            generateComponentOutputVersion(
              fillAnsiLength(currentVersion!, componentKeyLengthMap.originVersion),
              newVersion
            ),
            componentKeyLengthMap[key]
          );
        }
      }

      /** ======================== Change the color according to different status ======================== */
      if (component.status === 'stable' && colorHeroUIComponentKeys.includes(key)) {
        value = chalk.greenBright(value);
      } else if (component.status === 'new') {
        value = chalk.magentaBright(value);
      } else if (component.status === 'updated') {
        value = chalk.blueBright(value);
      }

      outputData += value + padEnd;
    }

    outputData;

    acc.push(outputData);

    return acc;
  }, [] as string[]);

  /** ======================== Generate box header ======================== */
  let boxHeader = rounded.topLeft + padStart.replace(/.*/g, rounded.horizontal).slice(1);
  let boxHeaderSec = padStart;
  let boxHeaderTrd = rounded.vertical + padStart.replace(/.*/g, rounded.horizontal).slice(1);

  for (const key of orderHeroUIComponentKeys) {
    boxHeader += `${rounded.horizontal.padEnd(componentKeyLengthMap[key] + 7, rounded.horizontal)}`;
    boxHeaderSec += chalk.redBright(PasCalCase(key).padEnd(componentKeyLengthMap[key])) + padEnd;
    boxHeaderTrd += `${rounded.horizontal.padEnd(
      componentKeyLengthMap[key] + 7,
      rounded.horizontal
    )}`;
  }

  boxHeader = boxHeader.slice(0, -2) + rounded.topRight;
  boxHeaderTrd = boxHeaderTrd.slice(0, -2) + rounded.vertical;

  /** ======================== Generate box footer ======================== */
  let boxFooter = rounded.bottomLeft + padStart.replace(/.*/g, rounded.horizontal).slice(1);

  for (const key of orderHeroUIComponentKeys) {
    boxFooter += `${rounded.horizontal.padEnd(componentKeyLengthMap[key] + 7, rounded.horizontal)}`;
  }

  boxFooter = boxFooter.slice(0, -2) + rounded.bottomRight;

  transformComponentsOutput = [
    boxHeader,
    boxHeaderSec,
    boxHeaderTrd,
    ...transformComponentsOutput,
    boxFooter
  ];

  Logger.info(message);

  Logger.log(transformComponentsOutput.join('\n'));
}

/**
 * Output the environment information e.g. OS, CPU, Node version, etc.
 */
export function outputInfo() {
  Logger.newLine();
  Logger.log(chalk.redBright('Environment Info:'));
  Logger.log(chalk.blueBright('  System:'));
  Logger.log(chalk.blueBright('    OS:'), process.platform);
  Logger.log(chalk.blueBright('    CPU:'), process.arch);
  Logger.log(chalk.greenBright('  Binaries:'));
  Logger.log(chalk.greenBright('    Node:'), process.version);
  Logger.newLine();
}

/**
 * Output a box with the content
 * @param text
 * @param center
 * @param log
 * @param color
 * @param title
 * @param borderStyle
 * @param padding
 * @param align
 */
export function outputBox({
  align = 'center',
  borderStyle = 'round',
  center = false,
  color,
  log = true,
  padding = 0,
  text,
  title
}: {
  text: string;
  center?: boolean;
  log?: boolean;
  color?: ChalkColor;
  title?: string;
  borderStyle?: keyof typeof boxRound;
  padding?: number;
  align?: 'left' | 'center' | 'right';
}) {
  const rounded = boxRound[borderStyle];
  const mergedRounded = color
    ? Object.fromEntries(Object.entries(rounded).map(([key, value]) => [key, chalk[color](value)]))
    : rounded;
  const contentArr = text.split('\n');
  const transformArr = contentArr.map((c) => c.replace(colorMatchRegex, ''));

  const isPadding = padding > 0;
  const paddingLength = padding;

  const mergedPadding = center || isPadding;

  let maxLength = transformArr.reduce((acc, cur) => (cur.length > acc ? cur.length : acc), 0);

  // Update the padding maxLength
  // paddingLength * 2 because one vertical line == 4 spaces
  maxLength = isPadding ? maxLength + paddingLength * 4 : maxLength;

  const clearColorTitle = title ? title.replace(colorMatchRegex, '') : '';
  const titleLength = title ? clearColorTitle.length : 0;
  let titleHeaderLength = maxLength - titleLength;
  const spaceLen = 2;

  while (titleLength + spaceLen + paddingLength >= maxLength) {
    // Need to adjust the maxLength
    maxLength += Math.floor(titleLength / 2);
  }
  // Update the titleHeaderLength
  titleHeaderLength = maxLength - titleLength;

  const boxHeaderContent = (() => {
    if (title) {
      if (align === 'center') {
        const spaceFir = Math.floor(titleHeaderLength / 2) - 1;
        const spaceSec = Math.ceil(titleHeaderLength / 2) - 1;

        const padFir = spaceFir > 0 ? mergedRounded.horizontal.repeat(spaceFir) : '';
        const padSec = spaceSec > 0 ? mergedRounded.horizontal.repeat(spaceSec) : '';

        return `${padFir} ${title} ${padSec}`;
      } else if (align === 'left') {
        return ` ${title} ${mergedRounded.horizontal.repeat(titleHeaderLength - 2)}`;
      } else {
        return `${mergedRounded.horizontal.repeat(titleHeaderLength - 2)} ${title} `;
      }
    }

    return mergedRounded.horizontal.repeat(maxLength);
  })();

  const boxHeader = mergedRounded.topLeft + boxHeaderContent + mergedRounded.topRight;
  const boxFooter =
    mergedRounded.bottomLeft +
    mergedRounded.horizontal.repeat(maxLength) +
    mergedRounded.bottomRight;

  let boxContent = contentArr.reduce((acc, cur) => {
    const transformCur = cur.replace(colorMatchRegex, '');
    const spaceLength = maxLength - transformCur.length;

    const pad = ' '.repeat(spaceLength);

    const spaceFir = Math.floor(spaceLength / 2);
    const spaceSec = Math.ceil(spaceLength / 2);

    const padFir = spaceFir > 0 ? ' '.repeat(spaceFir) : '';
    const padSec = spaceSec > 0 ? ' '.repeat(spaceSec) : '';

    // Over 2 cause one vertical line == 2 spaces
    // paddingLength = Math.floor(Math.max(paddingLength, spaceFir, spaceSec) / 2);

    if (center) {
      acc.push(
        `${mergedRounded.vertical}${spaceLength ? `${padFir}${cur}${padSec}` : cur}${
          mergedRounded.vertical
        }`
      );
    } else if (padding) {
      const endLen = spaceLength - paddingLength * 2;

      acc.push(
        `${mergedRounded.vertical}${' '.repeat(paddingLength * 2)}${cur}${' '.repeat(endLen)}${
          mergedRounded.vertical
        }`
      );
    } else {
      acc.push(
        `${mergedRounded.vertical}${spaceLength > 0 ? `${cur}${pad}` : cur}${
          mergedRounded.vertical
        }`
      );
    }

    return acc;
  }, [] as string[]);

  // Generate the padding
  if (mergedPadding) {
    for (let i = 0; i < paddingLength; i++) {
      boxContent.unshift(
        `${mergedRounded.vertical}${' '.repeat(maxLength)}${mergedRounded.vertical}`
      );
      boxContent.push(`${mergedRounded.vertical}${' '.repeat(maxLength)}${mergedRounded.vertical}`);
    }
  }

  boxContent = [boxHeader, ...boxContent, boxFooter];

  log && Logger.log(boxContent.join('\n'));

  return boxContent.join('\n');
}

function generateComponentOutputVersion(currentVersion: string, newVersion: string) {
  return `${chalk.white(`${currentVersion} ->`)} ${chalk.yellowBright(`${newVersion} (new)`)}`;
}

export function outputDeprecatedInfo() {
  outputBox({
    color: 'yellow',
    padding: 1,
    text: `NextUI has rebranded to HeroUI! These packages are deprecated and won’t receive updates.
HeroUI offers the same great features with ongoing improvements.

→ ${chalk.bold('Switch to [HeroUI](https://heroui.com) for the latest updates.')}
→ ${chalk.bold('Migration guide:')} [NextUI to HeroUI](https://heroui.com/docs/nextui-to-heroui)
→ ${chalk.bold('New NPM package:')} "@heroui/react"

Thanks for your support — see you at HeroUI!`,
    title: chalk.yellow(`❗️ Notice: NextUI is now ${chalk.bold('HeroUI')} ❗️`)
  });
}

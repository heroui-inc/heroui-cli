import retry from 'async-retry';
import chalk from 'chalk';
import ora from 'ora';

export async function fetchPackageLatestVersion(packageName: string): Promise<string> {
  const text = `Fetching ${packageName} version`;
  const spinner = ora({
    discardStdin: false,
    spinner: {
      frames: [
        `⠋ ${chalk.gray(`${text}.`)}`,
        `⠙ ${chalk.gray(`${text}..`)}`,
        `⠹ ${chalk.gray(`${text}...`)}`,
        `⠸ ${chalk.gray(`${text}.`)}`,
        `⠼ ${chalk.gray(`${text}..`)}`,
        `⠴ ${chalk.gray(`${text}...`)}`,
        `⠦ ${chalk.gray(`${text}.`)}`,
        `⠧ ${chalk.gray(`${text}..`)}`,
        `⠇ ${chalk.gray(`${text}...`)}`,
        `⠏ ${chalk.gray(`${text}.`)}`
      ],
      interval: 150
    }
  });

  spinner.start();

  try {
    return await retry(
      async () => {
        const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`, {
          headers: {
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();

        return (data as {version: string}).version;
      },
      {
        retries: 2
      }
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        throw new Error('Connection failed. Please check your network connection.');
      }
      throw error;
    }
    throw new Error('Parse version info failed');
  } finally {
    spinner.stop();
  }
}

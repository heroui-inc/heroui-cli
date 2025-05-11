import type {SAFE_ANY} from './type';

import {findUp} from 'find-up';
import path from 'pathe';

import {ROOT} from 'src/constants/path';
import {getSelect} from 'src/prompts';

type TupleToUnion<T extends readonly SAFE_ANY[]> = T[number];

export const AGENTS = ['npm', 'bun', 'pnpm', 'yarn'] as const;

export type Agent = TupleToUnion<typeof AGENTS>;

export const agents = AGENTS;

// the order here matters, more specific one comes first
export const LOCKS: Record<string, Agent> = {
  'bun.lock': 'bun',
  'bun.lockb': 'bun',
  'npm-shrinkwrap.json': 'npm',
  'package-lock.json': 'npm',
  'pnpm-lock.yaml': 'pnpm',
  'yarn.lock': 'yarn'
};

export async function detect(cwd = ROOT) {
  let agent: Agent;
  const lockPath = await findUp(Object.keys(LOCKS), {cwd});

  // detect based on lock
  if (lockPath) {
    agent = LOCKS[path.basename(lockPath)]!;
  } else {
    agent = await getSelect(
      'No agent found, please choose one',
      AGENTS.map((agent) => ({
        title: agent,
        value: agent
      }))
    );
  }

  return agent;
}

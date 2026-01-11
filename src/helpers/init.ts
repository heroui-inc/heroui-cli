import type {InitOptions, SAFE_ANY} from './type';

import {templatesMap} from 'src/actions/init-action';

import {AGENTS, type Agent} from './detect';
import {printMostMatchText} from './math-diff';

export function checkInitOptions(template: InitOptions['template'], agent: Agent) {
  if (template) {
    if (!Object.keys(templatesMap).includes(template)) {
      printMostMatchText(Object.keys(templatesMap), template);
    }
  }
  if (agent) {
    if (!AGENTS.includes(agent)) {
      printMostMatchText(AGENTS as SAFE_ANY, agent);
    }
  }
}

import fs from 'node:fs';
import path from 'node:path';
import * as ReactNamespace from 'react';
import { renderToString } from 'react-dom/server';

import { testRunner } from './setup/test-runner';
import { ThreadsPanel } from '../client/src/components/ThreadsPanel';
import { CoverageInsightsPanel } from '../client/src/components/CoverageInsightsPanel';
import { SpotlightSettingsPanel } from '../client/src/components/SpotlightSettingsPanel';

const React = ReactNamespace;
(globalThis as any).React = ReactNamespace;

const projectPagePath = path.resolve('client/src/pages/ProjectPage.tsx');
const projectPageSource = fs.readFileSync(projectPagePath, 'utf8');

const ensureNavigator = () => {
  if (!(globalThis as any).navigator) {
    (globalThis as any).navigator = { clipboard: { writeText: async () => {} } };
  }
};

const expectTabTriggers = (source: string, section: string, tabs: string[]) => {
  for (const tab of tabs) {
    expect(source.includes(`value="${tab}"`)).toBeTruthy();
  }
  console.log(`  ↳ Verified ${section} tabs: ${tabs.join(', ')}`);
};

testRunner.registerSuite('Workspace UI Panels', {
  beforeAll: ensureNavigator,
  tests: [
    {
      name: 'Threads panel renders collaborative discussion data',
      fn: () => {
        const html = renderToString(React.createElement(ThreadsPanel, { projectId: 123 }));
        expect(html).toContain('Discuss database connection pooling strategy');
        expect(html).toContain('Clarify design tokens usage in sidebar component');
      }
    },
    {
      name: 'Coverage insights panel surfaces metrics and regressions',
      fn: () => {
        const html = renderToString(React.createElement(CoverageInsightsPanel, { projectId: 321 }));
        expect(html).toContain('Coverage Insights');
        expect(html).toContain('Statements');
        expect(html).toContain('Coverage by file');
      }
    },
    {
      name: 'Spotlight settings panel exposes sharing controls',
      fn: () => {
        const html = renderToString(React.createElement(SpotlightSettingsPanel, { projectId: 555 }));
        expect(html).toContain('Spotlight Page');
        expect(html).toContain('Public visibility');
        expect(html).toContain('Suggest tags');
      }
    },
    {
      name: 'Project page declares debugger, tests, history, and secrets tabs in bottom panel',
      fn: () => {
        expectTabTriggers(projectPageSource, 'bottom panel', ['debugger', 'tests', 'history', 'secrets']);
      }
    },
    {
      name: 'Project page exposes collaboration and insights tabs in right rail',
      fn: () => {
        expectTabTriggers(projectPageSource, 'right rail', ['threads', 'extensions', 'history', 'coverage', 'spotlight', 'storage']);
      }
    }
  ]
});

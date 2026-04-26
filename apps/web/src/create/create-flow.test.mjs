import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const stateSource = await readFile(new URL('./state.ts', import.meta.url), 'utf8');
const typesSource = await readFile(new URL('./types.ts', import.meta.url), 'utf8');
const apiSource = await readFile(new URL('./api.ts', import.meta.url), 'utf8');
const wizardSource = await readFile(new URL('./NewProjectWizard.tsx', import.meta.url), 'utf8');
const commandsSource = await readFile(new URL('./commands.ts', import.meta.url), 'utf8');

assert.match(typesSource, /copying_files/);
assert.match(typesSource, /resolving_dependencies/);
assert.match(typesSource, /spawning_preview/);
assert.match(stateSource, /bootProgress/);
assert.match(apiSource, /\/api\/projects\/from-template/);
assert.match(apiSource, /\/api\/projects\/boot\/.*\/events/);
assert.match(apiSource, /\/api\/projects\/imports\/git\/detect/);
assert.match(wizardSource, /Cloud Run region/);
assert.match(wizardSource, /TemplateGallery/);
assert.match(wizardSource, /GitImportPanel/);
assert.match(commandsSource, /project\.new/);
assert.match(commandsSource, /Mod\+N/);

console.log('create-flow contract test passed');

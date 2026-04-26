import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const iosInfo = await readFile(new URL('./ios/ECode/Info.plist', import.meta.url), 'utf8');
const entitlements = await readFile(new URL('./ios/ECode/ECode.entitlements', import.meta.url), 'utf8');
const androidManifest = await readFile(new URL('./android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
const fastfile = await readFile(new URL('../../fastlane/Fastfile', import.meta.url), 'utf8');

assert.match(iosInfo, /NSCameraUsageDescription/);
assert.match(entitlements, /applinks:ecode\.app/);
assert.match(androidManifest, /POST_NOTIFICATIONS/);
assert.match(androidManifest, /ecode/);
assert.match(fastfile, /TestFlight/);
assert.match(fastfile, /Play Internal Testing/);

console.log('mobile shipping contract test passed');

# Mobile E2E (Detox)

Detox skeleton for the Capacitor iOS/Android apps in `ios/` and `android/`.

## ⚠️ Open release blocker

Per `docs/PRODUCTION-CERTIFICATION.md`, the mobile gate explicitly
calls out: **"Blocage explicite: pas de client React Native pur dans
ce repo"** — the app is Capacitor (single WebView around the web
bundle), not React Native. Detox is RN-first; running it against
Capacitor works for *launch* and *crash* coverage, but the
in-WebView UI must be probed with `web.element(...)` matchers, and
that requires `data-testid` hooks added to the React shell. The
deeper "real RN test suite" blocker stays open until either:

1. A pure RN client is added to this repo, or
2. The Capacitor app is fully instrumented with `data-testid` selectors
   on every interactive surface and the `web.*` matcher coverage is
   considered acceptable for release.

This skeleton unblocks (1) by giving you a runnable launch-and-smoke
gate today, and ladders into (2) as testIDs are added.

## Layout

- `.detoxrc.js` — Detox 20 config; iOS/Android debug + release apps,
  iPhone 15 sim and `Pixel_6_API_34` AVD.
- `jest.config.js` — Jest runner glue; rootDir is the repo root so paths
  in `binaryPath` resolve naturally.
- `starters/launch.test.ts` — single smoke test: app launches, WebView
  host is present. Replace as real testIDs land.

## One-time install

Detox is heavy (Xcode CLI, Android SDK, native deps). It is **not**
listed in `package.json` to keep CI installs fast. Install it locally
when you actually run the suite:

```bash
npm i -D detox @types/detox jest @types/jest
# iOS extras:
brew tap wix/brew && brew install applesimutils
# Android extras: have JDK 17 + an AVD named Pixel_6_API_34 (or edit .detoxrc.js)
```

## Running

```bash
# Build and run iOS suite on the simulator
detox build  --config-path e2e-mobile/.detoxrc.js -c ios.sim.debug
detox test   --config-path e2e-mobile/.detoxrc.js -c ios.sim.debug

# Build and run Android suite on the emulator
detox build  --config-path e2e-mobile/.detoxrc.js -c android.emu.debug
detox test   --config-path e2e-mobile/.detoxrc.js -c android.emu.debug
```

Or via the npm shortcuts (added in `package.json`):

```bash
npm run mobile:e2e:ios
npm run mobile:e2e:android
```

## What this skeleton does NOT do

- It does not bring up a backend. If your launch flow hits the API,
  point the app at a staging URL via the existing `capacitor.config.ts`
  `server.hostname` or wire a debug-only override.
- It does not instrument the React shell with `data-testid` attributes.
  Do that incrementally as you add real assertions.
- It does not run on devices in CI. CI runners need macOS for iOS; add
  the Detox macOS workflow once the local suite is green.

## Next steps to close the gate

1. Add `data-testid` to: app shell root, main router slot, login form,
   project list, editor host. Update `starters/launch.test.ts` to assert
   on those via `web.element(by.web.id(...))`.
2. Add 3–5 real flow tests covering: login, open project, edit file,
   open AI panel, log out.
3. Wire `npm run mobile:e2e:ios` into the macOS CI workflow.

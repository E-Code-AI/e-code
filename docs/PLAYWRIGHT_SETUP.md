# Playwright E2E Testing Setup Guide

## Overview
This project uses Playwright for end-to-end testing. The setup is optimized for Replit's NixOS environment with special considerations for system dependencies and browser binaries.

## System Requirements

### Nix System Dependencies (Required)
The following packages must be installed via Replit's package manager (NOT apt):

```
glib, nspr, nss, dbus, atk, at-spi2-atk, cups, 
xorg.libxcb, libxkbcommon, at-spi2-core, xorg.libX11, 
xorg.libXcomposite, xorg.libXdamage, xorg.libXext, 
xorg.libXfixes, xorg.libXrandr, libdrm, mesa, 
cairo, pango, alsa-lib
```

**Install via packager_tool:**
```typescript
packager_tool({
  install_or_uninstall: "install",
  language_or_system: "system",
  dependency_list: [
    "glib", "nspr", "nss", "dbus", "atk", "at-spi2-atk", "cups",
    "xorg.libxcb", "libxkbcommon", "at-spi2-core", "xorg.libX11",
    "xorg.libXcomposite", "xorg.libXdamage", "xorg.libXext",
    "xorg.libXfixes", "xorg.libXrandr", "libdrm", "mesa",
    "cairo", "pango", "alsa-lib"
  ]
})
```

### Browser Installation
After system dependencies are installed:

```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright install chromium
```

**IMPORTANT:** The `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` flag is REQUIRED in Replit because:
- Replit blocks `sudo` commands
- Playwright's host validation tries to use `sudo apt-get install`
- We manually install dependencies via Nix instead

## Running Tests

### Run All Tests
```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright test --project=chromium
```

### Run Specific Test File
```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright test test/e2e/homepage.spec.ts --project=chromium
```

### Run with UI Mode (Debugging)
```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright test --ui
```

### Generate Test Report
```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright show-report
```

## Configuration

### Environment Variables
The Playwright config (`playwright.config.ts`) supports the following environment variables:

- `BASE_URL` - Base URL for testing (default: http://localhost:5000)
- `TRACE` - Trace mode (default: on-first-retry)
- `SCREENSHOT` - Screenshot mode (default: only-on-failure)
- `VIDEO` - Video recording mode (default: retain-on-failure)
- `ACTION_TIMEOUT` - Action timeout in ms (default: 15000)
- `NAV_TIMEOUT` - Navigation timeout in ms (default: 30000)
- `STORAGE_STATE` - Path to authentication storage state file
- `CI` - CI mode flag (enables retries and single worker)

### Example Usage
```bash
BASE_URL=https://myapp.replit.app \
TRACE=on \
SCREENSHOT=on \
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
npx playwright test
```

## Test Structure

### Available Test Suites
1. **Homepage Tests** (`test/e2e/homepage.spec.ts`)
   - Page loading and title verification
   - Navigation link functionality
   - Authentication UI elements
   - Mobile responsiveness
   - Console error checking

2. **Authentication Tests** (`test/e2e/auth.spec.ts`)
   - Login page display
   - Registration page display
   - Form validation
   - Invalid credential handling
   - Login/Register navigation toggle

3. **AI Agent Tests** (`test/e2e/ai-agent.spec.ts`)
   - Conversation creation and mode switching
   - Autonomous mode enable/disable
   - Risk assessment API
   - Plan generation
   - Agent UI interaction

## Test Results (Latest Run)

### Homepage Tests: ✅ 5/5 PASSED
- should be responsive on mobile (22.8s)
- should load homepage successfully (24.8s)
- should display login/register buttons (24.7s)
- should have working navigation links (25.9s)
- should have no console errors (5.7s)

### Auth Tests: ⚠️ 3/5 PASSED
- ✅ should display login page (9.7s)
- ✅ should display register page (11.8s)
- ✅ should show validation errors for empty form (12.4s)
- ❌ should handle login with invalid credentials (UI bug: error message not displayed)
- ❌ should toggle between login and register (UI bug: navigation logic)

### AI Agent Tests: ❌ 0/13 PASSED
- All blocked by auth endpoint failure
- Reveals critical gap: test user authentication not working

## Known Issues

### Issue 1: Auth Endpoint Failing
**Problem:** `POST /api/auth/login` returns non-OK status for testuser@test.com  
**Impact:** Blocks all API tests requiring authentication  
**Status:** Needs investigation

### Issue 2: Login Form UI Timeout
**Problem:** `page.fill('input[type="email"]')` times out after 15s  
**Impact:** UI tests can't authenticate  
**Root Cause:** Login form elements may have different selectors or not rendering  
**Status:** Needs investigation

### Issue 3: AI Agent UI Elements Not Found
**Problem:** Agent interface selectors not matching actual DOM  
**Impact:** Agent UI tests failing  
**Status:** Pending auth fix

## Troubleshooting

### Problem: "Host system is missing dependencies"
**Solution:** Install Nix dependencies listed above, then set `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`

### Problem: "Browser executable not found"
**Solution:** 
```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright install chromium --force
```

### Problem: "Permission denied" or "sudo: command not found"
**Solution:** Use Nix packages instead of apt. Replit blocks sudo commands.

### Problem: Tests timeout or fail randomly
**Solution:** 
- Increase timeouts in playwright.config.ts
- Run tests sequentially: `--workers=1`
- Enable retries: `--retries=2`

### Problem: "No report found"
**Solution:** Tests must run first to generate report:
```bash
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright test
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright show-report
```

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Install Nix Dependencies
  run: nix-env -iA nixpkgs.glib nixpkgs.nspr nixpkgs.nss ...

- name: Install Playwright Browsers
  run: PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright install chromium

- name: Run Tests
  env:
    CI: true
    BASE_URL: http://localhost:5000
  run: PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright test
```

## Docker-Based Runner (Future)
For full cross-browser testing and CI/CD, consider Docker-based runner:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.56.1-jammy
WORKDIR /app
COPY . .
RUN npm ci
CMD ["npx", "playwright", "test"]
```

## Best Practices

1. **Always use environment flag:**
   ```bash
   PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
   ```

2. **Test against localhost first:**
   - Start app: `npm run dev`
   - Run tests: Tests auto-start dev server via webServer config

3. **Debug with UI mode:**
   ```bash
   PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 npx playwright test --ui
   ```

4. **Use data-testid attributes:**
   Add to components for reliable selectors:
   ```tsx
   <button data-testid="submit-button">Submit</button>
   ```

5. **Keep tests independent:**
   Each test should work in isolation

6. **Clean up after tests:**
   Use `afterEach` hooks to reset state

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Replit Nix Packages](https://search.nixos.org/packages)
- [E2E Testing Best Practices](https://playwright.dev/docs/best-practices)

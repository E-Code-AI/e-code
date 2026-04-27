# Load tests (k6)

Two scripts live here:

- `api-load.test.js` — broad surface ramp test (health/CORS/index). Useful for
  smoke-checking that a deploy is alive under traffic.
- `sessions-100.k6.js` — release-blocker test: 100 concurrent **sessions**,
  each running a realistic lifecycle (csrf → login → projects → logout).

## Quick start (unauthenticated)

```bash
# Boot a server first (separately).
BASE_URL=http://localhost:5000 npm run test:load:sessions
```

This runs in **public-only** mode: csrf, explore, readiness. It validates that
the server can hold 100 VUs against the unauthenticated surface — useful as a
first gate when you don't have seeded users.

## Full release run (authenticated)

1. Seed ≥10 load-test users into the target environment. Plain SQL works:

   ```sql
   -- Example only. Adapt to the project's seed/migration tooling and use
   -- properly hashed passwords.
   INSERT INTO users (email, password_hash, ...) VALUES (...);
   ```

2. Copy the fixture and fill it in:

   ```bash
   cp test/load/fixtures/users.json.example test/load/fixtures/users.json
   # edit users.json — DO NOT commit it (gitignored)
   ```

3. Run:

   ```bash
   BASE_URL=https://staging.example.com \
   USERS_FILE=./test/load/fixtures/users.json \
   npm run test:load:sessions
   ```

The script writes a structured summary to `test/load/results-sessions-100.json`
and prints a one-line summary to stdout.

## Tunables

All via env:

| var          | default | meaning                                |
|--------------|---------|----------------------------------------|
| `BASE_URL`   | `http://localhost:5000` | target server               |
| `USERS_FILE` | (unset) | path to JSON user array; enables auth  |
| `TARGET_VUS` | `100`   | peak concurrent VUs                    |
| `RAMP_UP`    | `30s`   | ramp-up duration                       |
| `HOLD`       | `5m`    | sustained-load duration                |
| `RAMP_DOWN`  | `30s`   | ramp-down duration                     |

## Pass criteria (release contract)

- `errors` rate < 1%
- `http_req_failed` rate < 1%
- `login_latency` p95 < 1500ms
- `projects_latency` p95 < 800ms
- `readiness_latency` p95 < 200ms
- `session_duration` p95 < 6000ms

These thresholds are enforced by k6 and will exit non-zero if violated.

## Installing k6

`brew install k6` on macOS, or see <https://k6.io/docs/get-started/installation/>.

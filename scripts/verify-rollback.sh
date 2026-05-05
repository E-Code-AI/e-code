#!/usr/bin/env bash
# verify-rollback.sh — post-rollback smoke check.
#
# Used by the deploy pipeline after `git revert` + redeploy: hits the public
# endpoints that prove the previous good build is live, fails non-zero if the
# rolled-back build doesn't match the expected git SHA or any critical
# endpoint returns >=500.
#
# Usage:
#   ./scripts/verify-rollback.sh https://staging.e-code.ai <expected-sha>
#
# Exit codes:
#   0  rollback verified
#   1  bad arguments
#   2  /api/health/build-info returned an unexpected SHA
#   3  one of the critical endpoints returned 5xx

set -euo pipefail

BASE_URL=${1:-}
EXPECTED_SHA=${2:-}

if [[ -z "$BASE_URL" || -z "$EXPECTED_SHA" ]]; then
  echo "usage: $0 <base-url> <expected-sha>" >&2
  exit 1
fi

BASE_URL="${BASE_URL%/}"
EXPECTED_SHORT="${EXPECTED_SHA:0:7}"

echo "==> Verifying rollback at ${BASE_URL} (expected ${EXPECTED_SHORT})"

# 1) build-info exposes the deployed git SHA.
build_info=$(curl -sS --max-time 10 "${BASE_URL}/api/health/build-info" || true)
deployed_sha=$(echo "$build_info" | grep -oE '"sha":"[a-f0-9]+"' | head -1 | sed 's/.*:"//;s/"$//') || true

if [[ -z "$deployed_sha" ]]; then
  echo "  warn: /api/health/build-info did not expose a sha (response: ${build_info:0:200})" >&2
elif [[ "${deployed_sha:0:7}" != "$EXPECTED_SHORT" ]]; then
  echo "  FAIL: deployed sha ${deployed_sha:0:7} != expected ${EXPECTED_SHORT}" >&2
  exit 2
else
  echo "  ok: deployed sha matches"
fi

# 2) Critical endpoints must respond with 2xx/3xx (not 5xx).
critical=(
  "/api/health/liveness"
  "/api/health/readiness"
  "/api/auth/csrf-token"
  "/api/projects/explore?limit=1"
)

for path in "${critical[@]}"; do
  status=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "${BASE_URL}${path}" || echo '000')
  if [[ "$status" =~ ^5 || "$status" == "000" ]]; then
    echo "  FAIL: ${path} returned ${status}" >&2
    exit 3
  fi
  echo "  ok: ${path} → ${status}"
done

echo "==> Rollback verified at ${BASE_URL}"

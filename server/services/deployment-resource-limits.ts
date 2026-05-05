/**
 * Per-tier resource caps for deployment runtimes.
 *
 * `applyResourceLimits` rewrites a start command into a shell snippet that
 * applies `ulimit -v` and `nice` before exec'ing the original command. This
 * is the deployment-manager's policy hook for tier-driven memory/CPU caps.
 *
 * Pulled into its own module so the pure function can be unit-tested without
 * importing the rest of the deployment-manager singleton (which spins up
 * timers, websocket bridges, etc.).
 */

export interface TierResourceLimits {
  memoryMb: number; // 0 = no cap
  niceLevel: number; // 0 = default scheduling; positive = lower priority
}

export function applyResourceLimits(
  rawCommand: string,
  limits: TierResourceLimits | undefined
): string {
  if (!limits) return rawCommand;
  const parts: string[] = [];
  // ulimit -v sets RLIMIT_AS (max virtual memory) in KB. Best-effort:
  // fall back to the unconstrained command if ulimit isn't available.
  if (limits.memoryMb > 0) {
    parts.push(`ulimit -v ${limits.memoryMb * 1024} 2>/dev/null || true`);
  }
  const niceWrap =
    limits.niceLevel > 0
      ? `nice -n ${limits.niceLevel} sh -c ${JSON.stringify(rawCommand)}`
      : rawCommand;
  parts.push(`exec ${niceWrap}`);
  return parts.join('; ');
}

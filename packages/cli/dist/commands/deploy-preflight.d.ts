export type PreflightIssueCode = 'MISSING_ENV_VAR' | 'LOCAL_STORAGE_PATH';
export interface PreflightIssue {
  code: PreflightIssueCode;
  severity: 'error' | 'warning';
  message: string;
  fix: string;
}
/**
 * Inspect a built `.mastra/output` directory plus the env vars about to be
 * uploaded and return a list of issues that are likely to cause the deploy
 * to fail with a USER-attributable error.
 *
 * Returns an empty array when no build output is found — the caller is
 * responsible for surfacing the missing-output error.
 */
export declare function preflightBuildOutput(
  targetDir: string,
  envVars: Record<string, string>,
): Promise<PreflightIssue[]>;
export type PreflightOutcome = 'ok' | 'blocked' | 'cancelled';
/**
 * Print preflight issues and decide whether the deploy should proceed.
 *
 * Returns:
 * - `'ok'`     — no issues, or warnings the caller has accepted.
 * - `'blocked'`— at least one error-severity issue. Errors always block,
 *                regardless of `autoAccept` / headless mode. Caller should
 *                exit non-zero so CI surfaces the failure.
 * - `'cancelled'` — warnings only, but the user explicitly declined the
 *                confirmation prompt. Caller should exit zero (normal
 *                user-initiated cancel).
 *
 * `--skip-preflight` is the escape hatch when a check is a false positive.
 */
export declare function printPreflightIssues(
  issues: PreflightIssue[],
  options: {
    autoAccept: boolean;
  },
): Promise<PreflightOutcome>;
//# sourceMappingURL=deploy-preflight.d.ts.map

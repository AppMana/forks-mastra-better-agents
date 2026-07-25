/**
 * Routes the embedding application serves alongside Mastra's own `/api` surface
 * (workspace sharing, inference status, uploads) all live under a single
 * prefix. Mastra's RBAC middleware derives the permission resource from the
 * first path segment, so the application must register its handlers under
 * exactly this prefix and grant the matching `<prefix>:write` permission.
 *
 * A deployment that needs a different prefix can inject
 * `window.MASTRA_APP_ROUTE_PREFIX` from the HTML it serves, the same way the
 * other `MASTRA_*` globals are injected. It is read once per call, so the
 * injection only has to happen before the first request.
 */
export const DEFAULT_APP_ROUTE_PREFIX = '/app';

/** The configured prefix, without a trailing slash. */
export function appRoutePrefix(): string {
  const injected =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & { MASTRA_APP_ROUTE_PREFIX?: string }).MASTRA_APP_ROUTE_PREFIX;
  if (typeof injected !== 'string' || !injected.startsWith('/')) return DEFAULT_APP_ROUTE_PREFIX;
  return injected.replace(/\/+$/, '') || DEFAULT_APP_ROUTE_PREFIX;
}

/** Absolute path for an application route, e.g. `appRoute('/workspace/sharing')`. */
export function appRoute(path: string): string {
  return `${appRoutePrefix()}${path}`;
}

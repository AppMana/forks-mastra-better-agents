import { describe, expect, it } from 'vitest';

import viteConfig from '../../../vite.config';
import { DEFAULT_APP_ROUTE_PREFIX, appRoute } from '../app-routes';

/**
 * The studio requests the embedding application's routes same-origin, so in dev
 * they land on Vite rather than on the Mastra server. Vite's SPA fallback only
 * answers requests that accept HTML, so a JSON fetch to an unproxied path gets a
 * bare 404 with no hint that the server was never asked — which is exactly how
 * this regressed the workspace sharing dialog.
 */
describe('application routes in the dev server', () => {
  const devConfig = viteConfig({ mode: 'development', command: 'serve' });
  const proxy = ('server' in devConfig ? devConfig.server?.proxy : undefined) ?? {};

  it('proxies the application route prefix to the Mastra server', () => {
    expect(Object.keys(proxy)).toContain(DEFAULT_APP_ROUTE_PREFIX);
    expect(proxy[DEFAULT_APP_ROUTE_PREFIX]).toEqual(proxy['/api']);
  });

  it('builds application paths under that same prefix', () => {
    expect(appRoute('/workspace/sharing')).toBe(`${DEFAULT_APP_ROUTE_PREFIX}/workspace/sharing`);
  });
});

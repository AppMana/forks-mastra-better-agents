import fs from 'node:fs/promises';
import { builtinModules } from 'node:module';
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';
import type { Plugin, PluginOption, UserConfig } from 'vite';
import { defineConfig } from 'vite';

import { DEFAULT_APP_ROUTE_PREFIX } from './src/lib/app-routes';

const studioStandalonePlugin = (targetPort: string, targetHost: string): PluginOption => ({
  name: 'studio-standalone-plugin',
  transformIndexHtml(html: string) {
    return html
      .replace(/%%MASTRA_SERVER_HOST%%/g, targetHost)
      .replace(/%%MASTRA_SERVER_PORT%%/g, targetPort)
      .replace(/%%MASTRA_API_PREFIX%%/g, '/api')
      .replace(/%%MASTRA_HIDE_CLOUD_CTA%%/g, 'true')
      .replace(/%%MASTRA_STUDIO_BASE_PATH%%/g, '')
      .replace(/%%MASTRA_SERVER_PROTOCOL%%/g, 'http')
      .replace(/%%MASTRA_CLOUD_API_ENDPOINT%%/g, '')
      .replace(/%%MASTRA_AUTO_DETECT_URL%%/g, 'true')
      .replace(/%%MASTRA_EXPERIMENTAL_FEATURES%%/g, process.env.EXPERIMENTAL_FEATURES || 'false')
      .replace(/%%MASTRA_EXPERIMENTAL_UI%%/g, process.env.MASTRA_EXPERIMENTAL_UI || 'false')
      .replace(/%%MASTRA_AGENT_SIGNALS%%/g, process.env.MASTRA_AGENT_SIGNALS ?? 'true');
  },
});

// @mastra/core dist chunks contain Node.js builtins (stream, fs, crypto, etc.) and
// Node-only npm packages (execa, and posthog-node via the EE fga-check module) from
// server-only code that shares chunks with browser-safe code. These code paths are
// never reached in the browser, so the modules are replaced with inert stubs.
//
// This has to run in dev as well as build. `vite build` lets Rollup tree-shake most
// of the server-only code away, but the dev dep-optimizer (esbuild) bundles whole
// modules eagerly and cannot drop their side effects, so without stubbing,
// posthog-node runs its module init in the browser (crashing in
// createGetModuleFromFilename) and the fga-check chunk calls crypto.createHash at
// module scope.
//
// enforce: 'pre' ensures this runs before Vite's built-in vite:resolve, which would
// otherwise replace builtins with __vite-browser-external — that throws on any
// property access rather than being inert.
const nodeOnlyPackages = new Map<string, string[]>([
  ['execa', []],
  ['posthog-node', ['PostHog']],
]);

const STUB_PREFIX = '\0node-stub:';
const isValidIdentifier = (name: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);

const stubNodeModulesPlugin: Plugin = {
  name: 'stub-node-modules',
  enforce: 'pre',
  resolveId(source) {
    if (nodeOnlyPackages.has(source)) {
      return { id: `${STUB_PREFIX}${source}`, moduleSideEffects: false };
    }
    const mod = source.startsWith('node:') ? source.slice(5) : source;
    const baseMod = mod.split('/')[0];
    if (builtinModules.includes(baseMod)) {
      return { id: `${STUB_PREFIX}${source}`, moduleSideEffects: false };
    }
  },
  async load(id) {
    if (!id.startsWith(STUB_PREFIX)) return;
    const source = id.slice(STUB_PREFIX.length);

    // Dev serves this stub as a real ES module over native ESM, where Rollup's
    // `syntheticNamedExports` does not apply — so every name an importer might
    // destructure has to be emitted explicitly. For Node builtins the authoritative
    // list is the real module's own exports, read here in the Node config process.
    let names = nodeOnlyPackages.get(source);
    if (!names) {
      try {
        names = Object.keys(await import(source.startsWith('node:') ? source : `node:${source}`));
      } catch {
        names = [];
      }
    }

    // Inert no-op: any property access, call or construction yields another no-op
    // instead of throwing, so an unexpected reference degrades quietly.
    const code = [
      'const noop = new Proxy(function () {}, {',
      '  get: () => noop,',
      '  apply: () => noop,',
      '  construct: () => noop,',
      '});',
      'export default noop;',
      ...names
        .filter(name => name !== 'default' && isValidIdentifier(name))
        .map(name => `export const ${name} = noop;`),
    ].join('\n');

    return { code, moduleSideEffects: false };
  },
};

const routesManifestPlugin = (): Plugin => {
  const getPropertyName = (name: ts.PropertyName) => {
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) {
      return name.text;
    }

    return undefined;
  };

  const collectRouteRoots = async (sourcePath: string) => {
    const sourceText = await fs.readFile(sourcePath, 'utf8');
    const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const arraysByName = new Map<string, ts.Expression>();

    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        arraysByName.set(node.name.text, node.initializer);
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    const collectedRoots = new Set<string>();
    const visitedArrayExpressions = new Set<ts.ArrayLiteralExpression>();

    const getRootSegment = (routePath: string) => {
      if (!routePath.startsWith('/')) {
        return undefined;
      }

      const normalizedPath = routePath.slice(1);
      const [rootSegment] = normalizedPath.split('/');
      return rootSegment || undefined;
    };

    const collectFromExpression = (expression: ts.Expression | undefined, inheritedRoot?: string) => {
      if (!expression) {
        return;
      }

      if (ts.isArrayLiteralExpression(expression)) {
        if (visitedArrayExpressions.has(expression)) {
          return;
        }

        visitedArrayExpressions.add(expression);

        for (const element of expression.elements) {
          collectFromArrayElement(element, inheritedRoot);
        }

        return;
      }

      if (ts.isIdentifier(expression)) {
        collectFromExpression(arraysByName.get(expression.text), inheritedRoot);
        return;
      }

      if (ts.isParenthesizedExpression(expression)) {
        collectFromExpression(expression.expression, inheritedRoot);
        return;
      }

      if (ts.isConditionalExpression(expression)) {
        collectFromExpression(expression.whenTrue, inheritedRoot);
        collectFromExpression(expression.whenFalse, inheritedRoot);
        return;
      }

      if (ts.isSpreadElement(expression)) {
        collectFromExpression(expression.expression, inheritedRoot);
      }
    };

    const collectFromArrayElement = (element: ts.Expression | ts.SpreadElement, inheritedRoot?: string) => {
      if (ts.isObjectLiteralExpression(element)) {
        collectFromObjectLiteral(element, inheritedRoot);
        return;
      }

      if (ts.isSpreadElement(element)) {
        collectFromExpression(element.expression, inheritedRoot);
        return;
      }

      if (ts.isConditionalExpression(element)) {
        collectFromExpression(element.whenTrue, inheritedRoot);
        collectFromExpression(element.whenFalse, inheritedRoot);
        return;
      }

      if (ts.isParenthesizedExpression(element)) {
        collectFromExpression(element.expression, inheritedRoot);
      }
    };

    const collectFromObjectLiteral = (objectLiteral: ts.ObjectLiteralExpression, inheritedRoot?: string) => {
      let routeRoot = inheritedRoot;

      for (const property of objectLiteral.properties) {
        if (!ts.isPropertyAssignment(property)) {
          continue;
        }

        const propertyName = getPropertyName(property.name);

        if (propertyName === 'path' && ts.isStringLiteralLike(property.initializer)) {
          routeRoot = getRootSegment(property.initializer.text) ?? inheritedRoot;

          if (routeRoot) {
            collectedRoots.add(routeRoot);
          }
        }
      }

      for (const property of objectLiteral.properties) {
        if (!ts.isPropertyAssignment(property)) {
          continue;
        }

        if (getPropertyName(property.name) === 'children') {
          collectFromExpression(property.initializer, routeRoot);
        }
      }
    };

    collectFromExpression(arraysByName.get('routes'));

    return [...collectedRoots].sort();
  };

  let resolvedConfig: { root: string; build: { outDir: string } } | undefined;

  return {
    name: 'routes-manifest',
    apply: 'build',
    configResolved(config) {
      resolvedConfig = config;
    },
    async writeBundle() {
      const root = resolvedConfig?.root ?? __dirname;
      const outDir = path.resolve(root, resolvedConfig?.build?.outDir ?? 'dist');
      const sourcePath = path.resolve(root, 'src', 'App.tsx');
      const outputPath = path.join(outDir, 'routes-manifest.json');
      const manifest = JSON.stringify(await collectRouteRoots(sourcePath), null, 2) + '\n';

      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(outputPath, manifest, 'utf8');
    },
  };
};

export default defineConfig(({ mode }) => {
  const commonConfig: UserConfig = {
    plugins: [stubNodeModulesPlugin, tailwindcss(), react(), routesManifestPlugin()],
    base: './',
    resolve: {
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react-resizable-panels', '@tanstack/react-query'],
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@internal-temp': path.resolve(__dirname, './src/vendor/@mastra'),
      },
    },
    build: {
      cssCodeSplit: false,
    },
    server: {
      fs: {
        allow: ['..'],
      },
    },
    define: {
      process: {
        env: {},
      },
    },
  };

  if (mode === 'development') {
    // Use environment variable for the target port, fallback to 4111
    const targetPort = process.env.PORT || '4111';
    const targetHost = process.env.HOST || 'localhost';

    if (commonConfig.plugins) {
      commonConfig.plugins.push(studioStandalonePlugin(targetPort, targetHost));
    }

    return {
      ...commonConfig,
      // `@standard-schema/spec` is a types-only package whose ESM entry
      // (dist/index.js) is a 0-byte file. esbuild therefore detects no ESM
      // exports during dep pre-bundling and marks it `needsInterop: true`,
      // which makes Vite rewrite `import * as spec from '@standard-schema/spec'`
      // (emitted by @mastra/core's bundled chunk) into a default import that the
      // module does not provide. Excluding it from pre-bundling makes Vite serve
      // the real (valid, empty) ESM module instead. The only use is a re-export
      // of the namespace, so an empty namespace is correct.
      optimizeDeps: {
        // `posthog-node` is stubbed by stubNodeModulesPlugin; keep the dep
        // optimizer from pre-bundling (and thus evaluating) the real package.
        exclude: ['@standard-schema/spec', 'posthog-node'],
      },
      server: {
        ...commonConfig.server,
        proxy: {
          '/api': {
            target: `http://${targetHost}:${targetPort}`,
            changeOrigin: true,
          },
          // The embedding application registers its own routes (see
          // lib/app-routes.ts) on the same server as `/api`, and the studio
          // requests them same-origin. Without this they hit Vite, which has no
          // such file and no SPA fallback for a JSON fetch, so every
          // application route answers 404 in dev only.
          [DEFAULT_APP_ROUTE_PREFIX]: {
            target: `http://${targetHost}:${targetPort}`,
            changeOrigin: true,
          },
        },
      },
    };
  }

  return {
    ...commonConfig,
  };
});

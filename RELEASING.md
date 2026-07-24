# Shipping fork packages to the dragonintel app

Fork packages are published as **GitHub release tarballs**, consumed by URL.
There are no packaging branches (`dragonintel/core-server-package` and
`dragonintel/mastra-cli-package` are retired) and no committed `dist/`.

Why: committing `dist/` fought `packages/core/.gitignore`, which silently dropped
every newly hashed chunk from `git add -A`, so published tarballs shipped stale
code while looking correct. Tarballs are built from the working tree, so what you
test is what ships.

## Publish

```shell
# 1. Build everything the app consumes
pnpm turbo build --filter @mastra/core --filter @mastra/server --filter mastra \
  --filter @mastra/deployer --filter @mastra/mcp --filter @mastra/loggers \
  --filter @mastra/agent-browser --filter @mastra/hono

# 2. Studio bundle goes inside the CLI package
rsync -a --delete packages/playground/dist/ packages/cli/dist/studio/

# 3. Pack with pnpm, NOT npm: pnpm rewrites `workspace:^` specs to real versions.
#    An npm-packed tarball fails to install with "Workspace not found".
OUT=$(mktemp -d)
for d in packages/core packages/server packages/cli packages/deployer packages/mcp \
         packages/loggers browser/agent-browser server-adapters/hono; do
  (cd "$d" && pnpm pack --pack-destination "$OUT")
done

# 4. One release per source commit
SHA=$(git rev-parse --short=12 HEAD)
gh release create "dist-$SHA" "$OUT"/*.tgz --repo AppMana/forks-mastra-better-agents \
  --title "dist $SHA" --notes "Built from $(git rev-parse --abbrev-ref HEAD)@$SHA"
```

## Consume

In `demos-hilton/mastra/package.json`, point `dependencies` and `resolutions` at
the new release URLs and run `yarn install`.

**Every `@mastra/*` package that lives in this monorepo must be pinned**, not just
core. The registry copies are newer and expect core exports this fork does not
have (e.g. `@mastra/deployer@1.52` imports `MAX_FS_SUBAGENT_DEPTH`), so a partial
pin fails at build time with a missing-export error.

The app's `scripts/patch-output-manifest.mjs` propagates these URLs into
`.mastra/output/package.json`, because `mastra build` writes plain registry
versions there and would otherwise reinstall upstream inside the container. The
Docker build greps for fork-only strings and fails if upstream slipped in.

# Shipping fork packages to consuming apps

Fork packages are published as **GitHub release tarballs**, consumed by URL.
There are no packaging branches and no committed `dist/`.

Why: committing `dist/` fought `packages/core/.gitignore`, which silently dropped
every newly hashed chunk from `git add -A`, so published tarballs shipped stale
code while looking correct. Tarballs are built from the working tree, so what you
test is what ships.

## Publish

```shell
# 1. Build everything a consuming app needs
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

# 4. One release per source commit.
#    --target is required: without it `gh release create` tags the repository's
#    DEFAULT branch, so every dist-* tag silently pointed at the upstream mirror
#    instead of the commit it is named after.
SHA=$(git rev-parse --short=12 HEAD)
gh release create "dist-$SHA" "$OUT"/*.tgz --repo AppMana/forks-mastra-better-agents \
  --target "$(git rev-parse HEAD)" \
  --title "dist $SHA" --notes "Built from $(git rev-parse --abbrev-ref HEAD)@$SHA"
```

## Branches

- `better-agents` — this fork's work, and the default branch.
- `main` — mirrors `upstream` (`mastra-ai/mastra`). Do not commit fork work here.

## Consume

In the consuming app's `package.json`, point `dependencies` and `resolutions` at
the new release URLs and run `yarn install`.

**Every `@mastra/*` package that lives in this monorepo must be pinned**, not just
core. The registry copies are newer and expect core exports this fork does not
have (e.g. `@mastra/deployer@1.52` imports `MAX_FS_SUBAGENT_DEPTH`), so a partial
pin fails at build time with a missing-export error.

An app that runs `mastra build` must also propagate these URLs into
`.mastra/output/package.json` — `mastra build` writes plain registry versions
there and would otherwise reinstall upstream inside the container. Grep the built
output for a fork-only string and fail the build if upstream slipped in.

## A trap worth knowing

Commits that only rebuild `dist/` prove nothing about whether a fix is present.
Check whether the **source** commit is an ancestor of what you pinned, not
whether some rebuild commit is — the two can diverge, and a bundle can be stale
while the tag looks right.

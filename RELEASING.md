# Releasing fork packages

Upstream `mastra-ai/mastra` already has a release system, and this fork reuses
almost all of it. The one thing it cannot reuse is the last step — publishing to
the npm registry — because that step requires owning the `@mastra` scope. So the
fork keeps upstream's build and versioning and substitutes a different
*delivery* mechanism: GitHub release tarballs, consumed by URL.

Everything below that is not tarball delivery is upstream's tooling. If you find
yourself writing a build step by hand, that is the mistake this document exists
to prevent.

## Why delivery is the only bespoke part

Upstream's release path is:

- `.changeset/` + `@changesets/cli` for versioning and changelogs
  (`version-packages.yml` opens the "chore: version packages" PR;
  `cron-alpha-publish.yml` keeps `main` in `changeset pre enter alpha` mode).
- `pnpm build` (turbo) to produce `dist/` for every package.
- `pnpm publish -r` to `registry.npmjs.org` (`npm-publish.yml`), with npm OIDC
  provenance.

The fork can run the first two verbatim. It cannot run the third:

- **Scope.** `@mastra/core` and friends can only be published by whoever owns
  `@mastra` on npm. We do not.
- **Renaming the scope does not rescue it.** Publishing these packages under a
  scope we do own fails for two independent reasons. First, `pnpm pack` rewrites
  `"@mastra/core": "workspace:^"` to a concrete version at pack time, so a
  renamed CLI package would still resolve a genuine `@mastra/core` from the
  public registry — the fork's own inter-package edges would leak back to
  upstream. Second, the consuming app and everything `mastra build` generates
  import `@mastra/core/...` as a literal specifier; renaming would mean
  rewriting generated output forever, and would conflict on every rebase onto
  upstream.
- **The workflows are inert here anyway.** Every job in `npm-publish.yml`,
  `version-packages.yml` and `cron-alpha-publish.yml` is gated on
  `github.repository == 'mastra-ai/mastra'`. They will never fire in this repo,
  by upstream's design, not by accident.

There is also no committed `dist/` and there are no packaging branches. Both
have been tried. Committing `dist/` fought `packages/core/.gitignore`, which
silently dropped every newly hashed chunk from `git add -A`, so published
artifacts shipped stale code while looking correct. Tarballs are packed from the
working tree, so what you tested is what ships.

## Branches

- `better-agents` — this fork's trunk, and the GitHub default branch.
- `main` — mirrors `upstream` (`mastra-ai/mastra`). Never commit fork work here.

`.changeset/config.json` sets `"baseBranch": "main"`. That is correct for
upstream and misleading here: `changeset status` and `changeset add` will diff
fork work against the upstream mirror, so everything looks changed. Read those
outputs with that in mind.

## Build

```shell
pnpm install
pnpm build
```

`pnpm build` is the root script (`pnpm turbo build`, examples excluded). To
narrow it, filter only the *leaf* packages you need — turbo's `^build` pulls
`@mastra/core`, `@mastra/server` and `@mastra/deployer` in as dependencies, so
naming them explicitly is redundant:

```shell
pnpm turbo build --filter mastra --filter @mastra/mcp --filter @mastra/loggers \
  --filter @mastra/agent-browser --filter @mastra/hono
```

**Do not copy the Studio bundle by hand.** `packages/cli/tsup.config.ts` already
resolves `@internal/playground` and copies its `dist` into
`packages/cli/dist/studio`, and `mastra#build` declares
`dependsOn: ["@internal/playground#build"]`. Building the CLI builds and embeds
Studio. Upstream depends on exactly this — `upload-studio-r2.yml` runs
`pnpm turbo build --filter="mastra"` and then reads `packages/cli/dist/studio`
with no copy step of its own. A hand-written `rsync` into that directory
duplicates the copy and, worse, hides it when the real copy fails.

## Version

The default is to pack whatever version is in `package.json`. That is the
mechanism behind the most dangerous failure mode this fork has, and upstream
already ships the fix.

The problem: `@mastra/core` in this tree is `1.41.0`, and `1.41.0` also exists on
the public registry as *different code*. Every fork build produces a file called
`mastra-core-1.41.0.tgz`, identical in name from one build to the next, and the
version string is what survives into `.mastra/output/package.json` when the
deployer regenerates it. Anything that re-resolves by version — a container
build, a lockfile-less install, a transitive edge you forgot to override — gets
upstream `1.41.0` and reports success.

Upstream's answer for "publish a build of a branch that is not `main`" is the
`snapshot` job in `npm-publish.yml`:

```shell
pnpm changeset-cli pre exit          # main is kept in `pre alpha` mode
pnpm changeset-cli version --snapshot fork
```

This stamps a version that cannot be confused with a registry release, so a
silent substitution becomes a 404. Two caveats, both real:

- `--snapshot` only rewrites packages that have a pending changeset, so add one
  (`pnpm changeset`) covering the fork packages first.
- By default the result is `0.0.0-fork-<timestamp>`, which sorts below
  everything. `snapshot.useCalculatedVersion` in `.changeset/config.json`
  produces a bumped real version instead.

Either way, do this on a throwaway working state. `changeset version` rewrites
`package.json` across the workspace and those rewrites are not fork work to
commit.

## Pack

```shell
OUT=$(mktemp -d)
for d in packages/core packages/server packages/cli packages/deployer packages/mcp \
         packages/loggers browser/agent-browser server-adapters/hono; do
  (cd "$d" && pnpm pack --pack-destination "$OUT")
done
```

**Pack with `pnpm`, never `npm`.** pnpm rewrites `workspace:^` specifiers to real
versions as it packs. An npm-packed tarball keeps the literal `workspace:^` and
fails to install in the consuming app with "Workspace not found". This costs an
afternoon every time it is rediscovered.

`packages/cli` has a `prepack` script that generates package docs; let it run.

## Release

```shell
SHA=$(git rev-parse --short=12 HEAD)
gh release create "dist-$SHA" "$OUT"/*.tgz --repo AppMana/forks-mastra-better-agents \
  --target "$(git rev-parse HEAD)" \
  --title "dist $SHA" --notes "Built from $(git rev-parse --abbrev-ref HEAD)@$SHA"
```

**`--target` is not optional.** Without it, `gh release create` creates the tag
on the repository's *default* branch. Because `better-agents` is the default
branch and `main` is the upstream mirror, this has already gone wrong in the
direction that is hardest to notice: a `dist-<sha>` tag whose name says one
commit while the tag object points somewhere else entirely. The tarballs are
still correct — they were packed from the working tree — but the tag stops being
evidence of what is inside them, which is the only reason the tag exists.

## Consume

In the consuming app's `package.json`, point `dependencies` and `resolutions` at
the new release URLs, then `yarn install`.

**Pin every `@mastra/*` package that lives in this monorepo, not just core.** The
registry copies are newer and expect core exports this fork does not have — for
example `@mastra/deployer@1.52` imports `MAX_FS_SUBAGENT_DEPTH` — so a partial
pin fails at build time with a missing-export error that names a symbol you have
never heard of.

An app that runs `mastra build` must also propagate these URLs into
`.mastra/output/package.json`. `mastra build` writes plain registry versions
there, and (see "Version" above) those versions resolve to real upstream
packages, so an install inside the built output silently replaces the fork.
Rewrite the generated manifest's `dependencies` *and* `overrides` from the app's
own pins, then grep the built output for a fork-only string and fail the build if
upstream slipped in.

## Verifying you shipped what you think

A commit that only rebuilds artifacts proves nothing about whether a source fix
is present. Check ancestry of the **source** commit against what you pinned:

```shell
git merge-base --is-ancestor <source-commit> <the-sha-in-the-dist-tag-you-pinned>
```

Asking whether some later rebuild commit is an ancestor answers a different
question, and the two answers diverge exactly when it matters.

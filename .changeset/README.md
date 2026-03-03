# Changesets

This directory contains changesets for BoostKit releases.

## How to create a release

1. Make your code changes
2. Run `pnpm changeset` — select changed packages and describe what changed
3. Run `pnpm changeset:version` — bumps version numbers and updates CHANGELOGs
4. Run `pnpm release` — builds and publishes to npm
5. Commit and push: `git add . && git commit -m "release" && git push`

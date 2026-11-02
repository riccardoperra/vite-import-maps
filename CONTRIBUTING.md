# Contribute to vite-import-maps

To check a change, run these commands from the repository root:

1. Install the workspace dependencies with `pnpm install --frozen-lockfile`.
2. Build the package with `pnpm build`.
3. Check the source and consumer declarations with `pnpm typecheck`.
4. Run the integration suite once with `pnpm test --run`.

Build the package again after changing its source. Examples and build fixtures import the built package.
To watch the tests during development, run `pnpm test`.

To format changed source files, run `pnpm exec prettier --write <files>`.
For Markdown files with code examples, add `--use-tabs` to preserve tab indentation in the snippets.

For a change to published behavior or APIs, add a file under `.changeset/`.
Check the proposed release with `pnpm exec changeset status --since=origin/main`.

Use the [roadmap](./ROADMAP.md) to find known limitations and proposed work.

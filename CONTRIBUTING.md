# Contributing to DrawShare

Thanks for your interest in contributing! This guide covers setup, code style, and the PR process.

## Setup

```sh
git clone https://github.com/shravanngoswamii/DrawShare.git
cd DrawShare
npm install
npm run dev
```

The dev server starts at `http://localhost:5173/`. To test live sharing from another device, open the dev URL using the machine's LAN IP on the same Wi-Fi.

## Tech stack

- Vue 3, TypeScript, Vite
- Pinia for state, vue-router for routing
- `perfect-freehand` for stroke smoothing
- `idb` for IndexedDB persistence
- WebRTC / PeerJS for live sharing

## Code style

[Biome](https://biomejs.dev/) handles formatting and linting. [Lefthook](https://github.com/evilmartians/lefthook) runs the checks automatically on every commit.

To run them manually:

```sh
npx biome check --write .   # format + lint + auto-fix
npx biome check .           # check only (no writes)
```

The CI `code-quality` workflow runs the same check, so fixing locally before pushing saves a round-trip.

## Build

```sh
npm run build
```

Output goes to `dist/`. Set `BASE_PATH` to deploy under a sub-path:

```sh
BASE_PATH=/DrawShare/ npm run build
```

## Making a change

1. Fork the repo and create a branch off `main` with a short descriptive name, e.g. `fix/toolbar-drag-handle` or `feat/dark-mode`.
2. Make your changes, keeping each commit focused.
3. Run `npx biome check --write .` before pushing.
4. Open a pull request against `main`. Describe _what_ you changed and _why_, and link the relevant issue if there is one. PRs automatically get a preview deploy so you can verify the change in a real browser.

## Reporting bugs

Use the **Bug report** issue template. Include:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/OS/device (especially for touch/Apple Pencil issues)

## Suggesting features

Use the **Feature request** issue template. Describe the use case first so we understand the problem before discussing the solution.

## Questions

Open a Discussion or drop a comment on the relevant issue.

## License

By contributing you agree that your changes will be licensed under the [MIT License](LICENSE).

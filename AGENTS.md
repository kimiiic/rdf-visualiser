# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the TypeScript front-end for the RDF visualizer (React components, hooks, shared utils).
- `tests/` mirrors `src/` with unit and integration specs; keep test files alongside the feature they cover when practical.
- `public/` contains static assets (HTML template, icons, bundled RDF samples) that are copied verbatim into builds.
- Create feature-focused subdirectories (e.g., `src/modules/graph`, `src/modules/editor`) to keep imports predictable and to simplify lazy loading.

## Build, Test, and Development Commands
- `pnpm install` – install dependencies; always rerun after pulling changes to keep lockfile synchronized.
- `pnpm dev` – start the Vite dev server with hot reload for rapid UI iteration.
- `pnpm build` – create a production bundle in `dist/`; run before submitting PRs to catch type or bundler errors.
- `pnpm test -- --watch=false` – execute the full Jest/Vitest suite once in CI mode.

## Coding Style & Naming Conventions
- Use 2-space indentation, ES2020 modules, and TypeScript strict mode.
- Components and hooks follow PascalCase (e.g., `GraphCanvas.tsx`, `useLayout.ts`); helper functions use camelCase.
- Export a single default per file unless a module intentionally exposes multiple utilities.
- Format code with `pnpm lint` (ESLint + Prettier); do not commit manual formatting tweaks that fight the tooling.

## Testing Guidelines
- Write unit tests with Jest/Vitest and React Testing Library; snapshot only for static markup.
- Name test files `*.test.ts` or `*.test.tsx` and colocate them with the code under test or in the parallel `tests/` tree.
- Cover new logic with happy-path and failure-path tests; target at least 80% statements for new modules.

## Commit & Pull Request Guidelines
- Use present-tense, imperative commit subjects (`Add canvas zoom controls`).
- Keep commits scoped: one feature or fix per commit, include context in the body if behavior changes.
- PRs must describe the problem, solution, test evidence (`pnpm test`, screenshots), and reference related issues (e.g., `Fixes #12`).
- Confirm `pnpm build` passes before requesting review and squash when merging unless history needs to stay expanded.

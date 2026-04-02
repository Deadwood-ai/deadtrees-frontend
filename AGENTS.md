# DeadTrees Frontend Agent Guide

Primary entrypoint for work in `deadtrees-frontend-react`.

## Repo

React + TypeScript frontend for `deadtrees.earth` and GeoLabel workflows.

Stack:

- React 18
- TypeScript
- Vite
- Ant Design
- Tailwind CSS
- TanStack Query
- Supabase client
- OpenLayers

Main feature areas:

- `src/pages/`
- `src/components/DatasetMap/`
- `src/components/DatasetDetailsMap/`
- `src/components/ReferencePatches/`
- `src/components/MLTiles/`
- `src/components/Upload/`
- `src/hooks/`

## Start

For a fresh session:

1. Read this file.
2. Read [`README.md`](/home/jj1049/dev/deadtrees-frontend-react/README.md).
3. Read the relevant plan in [`docs/plans`](/home/jj1049/dev/deadtrees-frontend-react/docs/plans).
4. Find the nearest existing pattern before editing.

Useful references:

- [`docs/plans/frontend-verification-foundation-plan.md`](/home/jj1049/dev/deadtrees-frontend-react/docs/plans/frontend-verification-foundation-plan.md)
- [`docs/plans/frontend-context-and-workflow-improvements.md`](/home/jj1049/dev/deadtrees-frontend-react/docs/plans/frontend-context-and-workflow-improvements.md)

## Kickoff

At the start of a feature or chat, gather only missing information.

Rules:

- do not ask for information already in the prompt or repo
- keep questions short and necessary
- focus on goal, scope, constraints, success criteria, and verification
- if enough context exists, proceed instead of forcing a questionnaire
- if asking multiple questions, use numbered questions with short options
- if a questionnaire/request-user-input style tool is available, prefer that

Default clarification checklist:

1. What is the exact user-facing goal?
2. What is in scope and out of scope?
3. What constraints must be preserved?
4. What does success look like?
5. How should the result be verified?

Preferred format:

1. Question
   1. Option A
   2. Option B
   3. Option C

## Critical Constraints

- Some project/security context still lives in `/home/jj1049/dev/deadtrees/.cursor/rules/AGENT.mdc`.
- Do not commit or push without explicit approval.
- User privileges are based on `privileged_users`, not `v2_users`.
- This is a map-heavy app; projection and lifecycle mistakes are common failure modes.

## Workflow

- Prefer small, local, incremental changes.
- Preserve existing naming and data-flow patterns unless intentionally refactoring.
- Keep UI, data access, types, and map logic separated when possible.
- Verify before expanding scope.

When unsure, make the smallest safe change first.

## Verification

Current baseline:

```bash
npm run lint
npm run build
```

Target workflow:

```bash
npm run typecheck
npm run lint
npm run build
npm run test
npm run test:e2e
```

Until the full foundation exists:

- always run `lint`
- always run `build`
- run any new verification script you add

Validation order:

1. type safety
2. lint
3. build
4. targeted automated checks
5. browser/manual review only when needed

Prefer deterministic checks over browser-agent inspection. For browser failures, traces are preferable to screenshot-driven debugging.

## Conventions

- Prefix domain interfaces with `I`
- Suffix component prop types with `Props`
- Use React Query for server state
- Use Context sparingly for truly global state
- Keep query keys stable and predictable
- Prefer `console.debug()` over `console.log()` for temporary diagnostics

Examples:

```ts
interface IDataset {}
interface DataTableProps {}

["datasets"]
["datasets", id]
["datasets", id, "labels"]
```

## OpenLayers Rules

- Never store map instances in React state; use refs.
- Clean up maps, layers, interactions, overlays, and subscriptions in effect cleanup.
- Be explicit about projections and coordinate transforms.
- Use refs for imperative map objects such as maps, layers, interactions, and overlays.

Be especially careful with:

- WGS84 vs Web Mercator
- UTM vs Web Mercator
- GeoJSON read/write projections
- bbox parsing and transforms

## North Star

Direction over time, not a forced rewrite:

- pages compose features, not all behavior inline
- hooks orchestrate behavior, not unrelated side effects
- heavy components should not mix UI, data loading, geometry logic, and persistence when separable
- shared domain types should not drift across similar modules
- map-specific imperative logic should be isolated from generic UI where possible

Ideal shape:

- `src/pages/`
- `src/features/<feature>/components/`
- `src/features/<feature>/hooks/`
- `src/features/<feature>/api/`
- `src/features/<feature>/types/`
- `src/features/<feature>/utils/`
- `src/shared/`


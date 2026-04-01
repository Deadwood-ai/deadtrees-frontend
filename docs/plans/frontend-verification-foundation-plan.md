# Frontend Verification Foundation Plan

**Date:** 2026-04-01  
**Status:** Draft  
**Priority:** High

---

## Summary

Build a reliable, low-cost verification loop for the DeadTrees frontend so Codex and human developers can ship changes with confidence without depending on expensive browser-agent review.

The app is a Vite + React + TypeScript + OpenLayers frontend, but it currently has no formal test runner or browser automation configured, and the baseline `npm run build` is already failing with a large set of TypeScript errors. That means the first goal is not "add lots of tests"; it is "restore a trustworthy stoplight," then layer in targeted regression and performance checks.

This plan is written so a fresh agent can start directly from the repo and execute in phases.

---

## Problem

Current issues:

- No dedicated `typecheck` script.
- No unit/integration test runner.
- No E2E/browser smoke coverage.
- No a11y smoke checks.
- No performance or bundle regression guardrails.
- `npm run build` is currently red due to many TypeScript issues across map and editor modules.

This creates two problems:

1. Frontend changes require expensive manual or browser-agent validation.
2. Regressions are easy to introduce in complex OpenLayers flows.

---

## Goal

Create a layered frontend verification strategy that is:

- Cheap enough to run often
- Strong enough to catch common regressions
- Friendly to Codex workflows
- Practical for a map-heavy OpenLayers app

The desired steady-state loop is:

1. Codex makes a change
2. Codex runs `typecheck`, `lint`, and targeted tests
3. Codex runs a focused Playwright smoke test when route or interaction behavior changed
4. Playwright traces are used for debugging failures
5. Browser-agent visual review is only used for ambiguous visual polish or hard interaction bugs

---

## Repo Findings

Verified in `/home/jj1049/dev/deadtrees-frontend-react`:

- Tooling is minimal in [package.json](/home/jj1049/dev/deadtrees-frontend-react/package.json#L7)
- Main route shell is in [src/App.tsx](/home/jj1049/dev/deadtrees-frontend-react/src/App.tsx#L93)
- Map-heavy overview lives in [src/components/DatasetMap/DatasetMap.tsx](/home/jj1049/dev/deadtrees-frontend-react/src/components/DatasetMap/DatasetMap.tsx#L207)
- Reference patch editor map lives in [src/components/ReferencePatches/ReferencePatchMap.tsx](/home/jj1049/dev/deadtrees-frontend-react/src/components/ReferencePatches/ReferencePatchMap.tsx#L64)

Observed baseline:

- No `vitest`, `playwright`, `testing-library`, `axe`, `storybook`, or `lighthouse` config
- No existing `*.test.*` or `*.spec.*` files
- `npm run build` currently fails with TypeScript errors

---

## Strategy

Use a layered testing model instead of relying on one expensive or brittle tool.

### Layer 1: Restore the Baseline

Add and enforce:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

But before these can be trusted in CI, the current TypeScript failures need to be reduced enough that the app has a green baseline again.

This is the first milestone. Without it, every later gate is noisy.

### Layer 2: Cheap Logic and UI Regression Checks

Add:

- `Vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `msw`

Focus here on stable UI and logic, not OpenLayers internals.

Best first targets:

- dataset filtering and table behavior
- upload validation flows
- processing status UI
- audit navigation helpers and guards
- route-level shell behavior
- pure utilities in `src/utils`

### Layer 3: Browser Smoke Coverage

Add:

- `Playwright`

Use it for focused route-level checks, not giant end-to-end suites.

Best first routes:

- `/`
- `/dataset`
- `/dataset/:id`
- `/dataset-audit/:id/reference-patches`
- `/dataset-corrections/:id`

Important rule:

- Prefer assertions on controls, sidebar state, URL changes, visible content, and network health
- Avoid broad screenshot-based assertions for map canvases unless absolutely necessary

### Layer 4: Accessibility Smoke Checks

Add:

- `axe-core`
- `@axe-core/playwright`

Run lightweight checks on the main routes above.

### Layer 5: Performance and Regression Guardrails

Add two kinds of checks:

- Bundle regression checks
- Runtime page-performance checks

Recommended:

- Vite bundle analyzer such as `rollup-plugin-visualizer`
- `Lighthouse CI` for a few representative routes

For map-heavy pages, also add app-specific Playwright assertions such as:

- key controls visible within a threshold
- map container rendered
- patch/tile selection updates sidebar state quickly
- no critical console errors
- no failed critical network requests

---

## Implementation Phases

## Phase 1: Green the Baseline

Goal:

- Make `typecheck`, `lint`, and `build` meaningful and passable

Tasks:

- Add `typecheck` script
- Audit current TypeScript errors and group them by area
- Fix the highest-leverage type issues first:
  - map layer typing
  - reference patch / ML tile type drift
  - missing module declarations
  - incorrect nullable handling
  - stale imports / unused symbols

Suggested grouping:

- `DatasetMap`
- `DatasetDetailsMap`
- `ReferencePatches`
- `MLTiles`
- shared utils and hooks

Deliverable:

- Green `npm run typecheck`
- Green `npm run lint`
- Green `npm run build`

## Phase 2: Add Unit and Integration Test Foundation

Goal:

- Introduce a cheap test harness for non-map logic and stable UI

Tasks:

- Install and configure `Vitest`
- Install Testing Library and `msw`
- Add a test setup file
- Add first tests for:
  - `src/utils`
  - `src/components/ProcessingProgress.tsx`
  - `src/components/FilterModal.tsx`
  - dataset list/table filtering behavior
  - route shell rendering

Deliverable:

- `npm run test`
- A small but credible initial regression suite

## Phase 3: Add Playwright Smoke Coverage

Goal:

- Cover the app’s most important user journeys with deterministic browser checks

Tasks:

- Install and configure `Playwright`
- Add route smoke tests for:
  - home browsing
  - dataset details loading
  - reference patch editor loading
  - corrections editor loading
- Enable trace collection on failure
- Add helper utilities/page objects for repeated setup

Deliverable:

- `npm run test:e2e`
- Trace-based debugging path for browser failures

## Phase 4: Add A11y and Performance Checks

Goal:

- Catch common regressions beyond pure correctness

Tasks:

- Add `axe` checks in Playwright
- Add bundle analysis script
- Add Lighthouse CI for a few stable routes
- Define lightweight thresholds or warnings

Deliverable:

- A11y smoke coverage for core routes
- Bundle and page-level regression visibility

---

## Recommended Scripts

Target shape for `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "typecheck": "tsc --noEmit",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "analyze": "vite build --mode analyze",
    "lhci": "lhci autorun"
  }
}
```

Final names can vary, but this is the intended capability set.

---

## How a Fresh Agent Should Start

Start in `/home/jj1049/dev/deadtrees-frontend-react`.

### Step 1

Confirm the current baseline:

```bash
npm run lint
npm run build
```

Then add and run:

```bash
npm run typecheck
```

if it exists, or wire it in first.

### Step 2

Triage the TypeScript failures into buckets instead of fixing randomly:

- map typing problems
- reference patch / ML tile type mismatch
- missing type packages or declarations
- stale imports / unused variables
- nullability issues

### Step 3

Focus on getting a green baseline before adding tests. Do not add Playwright first while the build is red.

### Step 4

After the baseline is green, add Vitest and Testing Library before Playwright.

### Step 5

Only after unit/integration foundation exists, add a small Playwright smoke layer.

---

## First Concrete Tasks

The first agent should aim to complete only this:

1. Add `typecheck` to `package.json`
2. Get `typecheck` and `build` substantially closer to green, ideally fully green
3. Add test scaffolding for `Vitest`
4. Add 2-4 initial tests for stable components/utilities

The first agent should not try to solve everything in one pass.

---

## Suggested Initial Test Targets

Good first tests:

- `src/utils/datasetUtils.ts`
- `src/utils/datasetVisibility.ts`
- `src/utils/fileValidation.ts`
- `src/components/ProcessingProgress.tsx`
- `src/components/FilterModal.tsx`
- basic route rendering for [src/App.tsx](/home/jj1049/dev/deadtrees-frontend-react/src/App.tsx#L93)

Delay heavy map interaction tests until after the basic harness is stable.

---

## Recommended Browser-Test Philosophy for This App

Because this app is OpenLayers-heavy:

- Prefer state and control assertions over screenshot assertions
- Prefer Playwright traces over browser-agent review for debugging
- Use full visual review only for:
  - layout/polish
  - responsive issues
  - animation glitches
  - interaction bugs that are hard to express in assertions

This keeps cost lower and feedback loops tighter.

---

## Definition of Done

This effort is successful when:

- `typecheck`, `lint`, and `build` are green
- the repo has a working unit/integration test foundation
- the repo has a focused Playwright smoke suite
- there is at least one a11y smoke check
- there is at least one performance or bundle regression check
- Codex can validate most frontend changes without defaulting to expensive browser-agent inspection

---

## Risks

- OpenLayers interactions can be hard to test if implementation details are tightly coupled to map instances
- Remote tiles and WebGL can make full visual snapshots flaky
- If the TypeScript baseline is not fixed first, new test tooling will add noise rather than confidence

Mitigation:

- phase the work
- keep early tests focused on stable UI and business logic
- use Playwright traces for map debugging

---

## Notes for Delegation

This plan is intended to be handed to a fresh agent as the source of truth.

When delegating:

- tell the agent to work in `/home/jj1049/dev/deadtrees-frontend-react`
- tell the agent to start with Phase 1 only unless explicitly expanding scope
- tell the agent not to rely on browser-agent review as the main validation path
- tell the agent to keep changes incremental and verify after each step

# Frontend Context and Workflow Improvements

**Date:** 2026-04-01  
**Status:** Draft  
**Scope:** Repo context files, agent rules, and general frontend developer workflow

---

## Summary

The frontend repo already has some useful context for agents and developers, but it is spread across a few different places and is not yet strong enough to support a fast, low-friction workflow for fresh contributors.

Current state:

- There is one frontend-specific Cursor rule file
- There is one local design-oriented skill
- There is a lightweight README
- There is a generic executor-mode document
- Some of the frontend instructions depend on cross-repo rules from the backend repo

This is a workable start, but not a complete frontend workflow system.

The main improvement opportunity is to turn these scattered hints into a small, explicit operating system for the frontend repo:

- one source of truth for repo-level rules
- one source of truth for setup and daily workflow
- one source of truth for testing and verification
- one source of truth for map/OpenLayers-specific development patterns

---

## What Exists Today

### 1. Frontend Cursor Rule

File:

- [`.cursor/rules/AGENT.mdc`](/home/jj1049/dev/deadtrees-frontend-react/.cursor/rules/AGENT.mdc)

Strengths:

- Contains useful frontend-specific knowledge
- Includes important OpenLayers guidance
- Mentions Supabase privilege-table gotchas
- Includes some React/TypeScript conventions

Weaknesses:

- It is Cursor-specific, not repo-generic
- It depends on a backend repo rule file by path
- It does not cover verification, testing, or performance workflow
- It mixes hard rules, examples, and suggestions without ranking them
- Some guidance is aspirational rather than enforced

### 2. Frontend Design Skill

File:

- [`.cursor/skills/frontend-design/SKILL.md`](/home/jj1049/dev/deadtrees-frontend-react/.cursor/skills/frontend-design/SKILL.md)

Strengths:

- Good visual guidance
- Strong fit for Ant Design + Tailwind work
- Useful guardrails against generic AI styling

Weaknesses:

- Focused on design/polish, not implementation workflow
- Does not help much with debugging, testing, map interactions, or performance

### 3. README

File:

- [`README.md`](/home/jj1049/dev/deadtrees-frontend-react/README.md)

Strengths:

- Good high-level project overview
- Lists core tech stack
- Basic local setup is easy to scan

Weaknesses:

- Too light for a fresh developer or fresh agent
- Does not explain the real local workflow
- Does not explain how frontend talks to backend/upload/Supabase in development
- Does not document verification commands beyond lint/build
- Does not explain the main feature architecture or map/editor boundaries

### 4. Executor Doc

File:

- [`docs/executor.md`](/home/jj1049/dev/deadtrees-frontend-react/docs/executor.md)

Strengths:

- Encourages small, atomic execution
- Encourages TypeScript/lint hygiene

Weaknesses:

- Written for a very specific checklist-driven workflow
- References `implementation.md`, which is not a general repo entrypoint
- Mentions `npm run lint:fix`, but that script does not exist today
- Too narrow to serve as the general developer workflow document

### 5. Shared Backend Rule Dependency

Referenced file:

- [`deadtrees/.cursor/rules/AGENT.mdc`](/home/jj1049/dev/deadtrees/.cursor/rules/AGENT.mdc)

Strengths:

- Contains important security and architecture constraints

Weaknesses:

- Cross-repo dependency makes frontend context less portable
- A fresh agent in the frontend repo alone may miss critical context
- Frontend contributors should not need to infer workflow from another repo’s Cursor rules

---

## Main Problems

### Problem 1: Context Is Tool-Specific Instead of Repo-Specific

Most of the useful guidance lives in `.cursor/` files. That helps Cursor, but not every tool, agent, or developer.

Best practice:

- important repo conventions should live in normal Markdown at the repo root or in `docs/`
- editor-specific rules should reference those docs, not be the only place the rules exist

### Problem 2: No Clear “Start Here” Path

A fresh developer or fresh agent does not currently have one obvious sequence like:

1. Read repo rules
2. Set up env
3. Run baseline checks
4. Understand feature areas
5. Know how to validate changes

That means every new session spends extra context budget re-deriving workflow.

### Problem 3: Missing Verification Workflow Documentation

This is the biggest operational gap.

The repo does not currently have a strong documented answer to:

- what commands to run before and after frontend changes
- how to validate map-heavy changes
- when to use browser automation versus manual review
- how to check for regressions or performance

### Problem 4: Missing Frontend Architecture Orientation

The README gives feature names, but not the working mental model for the codebase.

A fresh contributor would benefit from a short map of:

- route shell
- provider stack
- data hooks
- map modules
- audit/editor subsystems
- Supabase integration

### Problem 5: Some Guidance Is Stale or Mismatched

Examples:

- `docs/executor.md` mentions `npm run lint:fix`, but it is not in [package.json](/home/jj1049/dev/deadtrees-frontend-react/package.json#L7)
- frontend instructions say to see the backend rule file by path, which is fragile and non-obvious
- no mention of the current absence of tests or the desired future test workflow

---

## Recommended Improvements

## 1. Add a Repo-Root `AGENTS.md`

Add a standard repo-level agent/developer context file:

- `/home/jj1049/dev/deadtrees-frontend-react/AGENTS.md`

This should be the main, tool-agnostic entrypoint.

Suggested sections:

- Purpose of the repo
- Stack summary
- Critical constraints
- Main feature areas
- Local workflow
- Verification workflow
- Map/OpenLayers rules
- Supabase/data access notes
- Related docs

The Cursor rule file can then become a compact adapter that points to `AGENTS.md` instead of holding all core knowledge itself.

## 2. Split Rules by Concern

Instead of one frontend `AGENT.mdc` doing everything, define clearer layers:

- `AGENTS.md` for universal repo context
- `.cursor/rules/frontend-patterns.mdc` for implementation patterns
- `.cursor/rules/openlayers-patterns.mdc` for map-specific gotchas
- `.cursor/rules/frontend-verification.mdc` for tests, performance, and browser workflow

This reduces cognitive overload and makes the rules easier to maintain.

## 3. Upgrade the README Into a Real Developer Entry Point

Improve [README.md](/home/jj1049/dev/deadtrees-frontend-react/README.md) with:

- exact local setup expectations
- how to run the frontend against local or dev backend services
- available env file patterns and which one is actually used
- baseline commands:
  - install
  - dev
  - typecheck
  - lint
  - build
  - tests once they exist
- a short architecture map
- “where to look first” for core features

The README should answer “how do I get productive in 10 minutes?”

## 4. Add a Dedicated Frontend Workflow Doc

Add something like:

- `docs/developer-workflow.md`

This should document the day-to-day loop:

1. understand the feature area
2. make the change
3. run baseline checks
4. run targeted tests
5. run browser validation only if needed
6. inspect traces when browser tests fail

This is broader and more durable than the current `docs/executor.md`.

## 5. Add a Dedicated Verification Doc

Add something like:

- `docs/testing-and-verification.md`

It should explain:

- what should be covered by unit tests
- what should be covered by Playwright
- what should not rely on screenshots
- how to validate map-heavy changes
- how to check a11y
- how to check performance

This complements the verification foundation plan and turns it into reusable workflow documentation.

## 6. Add a Frontend Architecture Doc

Add something like:

- `docs/architecture/frontend-architecture.md`

Keep it short and practical.

Suggested contents:

- provider stack from `main.tsx`
- route structure from `App.tsx`
- main feature domains
- data flow with React Query and Supabase
- where OpenLayers maps live
- which components are “entrypoints” for editors

This would reduce repeated codebase exploration cost for both humans and agents.

## 7. Add a Map/OpenLayers-Specific Workflow Doc

Add something like:

- `docs/maps/openlayers-workflow.md`

This should capture the high-value patterns currently buried in rules:

- never store map instance in React state
- use refs for map/layers/interactions
- always clean up layers/interactions
- coordinate transform rules
- Web Mercator vs UTM gotchas
- preferred validation approach for map UI changes
- how to debug selection/drawing/overlay issues

This is especially valuable because map-heavy frontends have failure modes that generic React rules do not cover.

## 8. Add a Frontend Debugging Skill or Rule

Current local skill coverage is design-heavy but not debugging-heavy.

Add a skill or rule focused on:

- debugging OpenLayers behavior
- tracing React Query invalidation issues
- identifying rerender/state coupling problems
- validating Supabase-driven UI state
- choosing the cheapest verification path first

This would help both general development and Codex cost efficiency.

## 9. Make Rules Reflect the Intended Verification Workflow

Once the verification foundation is implemented, the repo rules should explicitly tell agents:

- run `typecheck` first
- run `lint`
- run relevant tests
- use Playwright traces before browser-agent review
- use screenshots only when visual judgment is required

That should live in both repo docs and tool rules.

---

## Suggested File Set

Recommended durable structure:

- `AGENTS.md`
- `README.md`
- `docs/developer-workflow.md`
- `docs/testing-and-verification.md`
- `docs/architecture/frontend-architecture.md`
- `docs/maps/openlayers-workflow.md`

Recommended Cursor-specific layer:

- `.cursor/rules/AGENT.mdc`
- `.cursor/rules/frontend-patterns.mdc`
- `.cursor/rules/openlayers-patterns.mdc`
- `.cursor/rules/frontend-verification.mdc`
- `.cursor/skills/frontend-design/SKILL.md`
- optional `.cursor/skills/frontend-debugging/SKILL.md`

---

## Prioritized Next Steps

### Highest Value

1. Add `AGENTS.md`
2. Improve `README.md`
3. Add `docs/developer-workflow.md`
4. Add `docs/testing-and-verification.md`

### Next Best

5. Add `docs/architecture/frontend-architecture.md`
6. Add `docs/maps/openlayers-workflow.md`
7. Split Cursor rules by concern

### Nice To Have

8. Add a frontend-debugging skill
9. Add a short “fresh agent handoff” template for planned implementation work

---

## Practical Recommendation

If only one small round of work is funded now, do this:

- create repo-root `AGENTS.md`
- update `README.md`
- add `docs/developer-workflow.md`

That gives the biggest immediate improvement for both humans and agents, and it lowers the amount of context that needs to be rebuilt in every new session.

If two rounds are possible, add:

- `docs/testing-and-verification.md`

That will directly support the broader frontend verification effort already documented in:

- [frontend-verification-foundation-plan.md](/home/jj1049/dev/deadtrees-frontend-react/docs/plans/frontend-verification-foundation-plan.md)

---

## Notes for a Fresh Agent

If this work is delegated, the fresh agent should:

1. Read the current frontend repo files listed above
2. Create a repo-root `AGENTS.md` that consolidates durable guidance
3. Keep Cursor-specific files as adapters, not primary knowledge stores
4. Avoid duplicating the same rules in multiple places
5. Prefer concise, high-signal workflow documentation over large narrative docs

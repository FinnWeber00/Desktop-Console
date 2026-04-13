---
name: desktop-console-dev-standards
description: Development rules and implementation standards for the personal desktop console project built with Electron, React, TypeScript, SQLite, Zustand, and Tailwind CSS. Use when working on this project to add features, refactor code, design architecture, implement UI, define data models, wire Electron main/preload/renderer communication, or review changes against the agreed stack, UX direction, and safety constraints.
---

# Desktop Console Development Standards

Follow these rules when building or modifying this project.

## Core Stack

Implement the project with this default stack unless the user explicitly changes direction:

- Electron
- React
- TypeScript
- Vite
- Zustand
- Tailwind CSS
- SQLite
- better-sqlite3
- Electron Forge

Do not introduce Vue, Java, Redux, or extra backend services unless the user explicitly asks to change the architecture.

## Product Goal

Treat this product as a desktop-first personal launcher and control console.

The core responsibilities are:

- Manage website cards
- Manage desktop application cards
- Organize cards under user-defined first-level categories
- Support local-first storage
- Support lock screen and password protection
- Support quick access patterns such as search, recent use, and later global summon

Do not expand the scope casually into a generic CMS, enterprise admin panel, or cloud-first platform.

## UX Direction

Keep the UI aligned with the currently preferred direction:

- Chinese interface
- Soft, clean, desktop-product feel
- Scenic/glassmorphism direction based on the preferred `v4` style
- Gentle contrast
- Clear hierarchy
- No heavy "geek dashboard" look
- No strong national-style decoration bias

When designing or refining UI:

- Prefer calm color palettes
- Keep card layouts ordered and readable
- Preserve soft glass panels, rounded corners, and layered depth
- Use Chinese labels for generic UI text
- Allow English brand names like `GitHub`, `VS Code`, `Docker`, `Cursor`

## Architecture Rules

Separate responsibilities strictly:

- `main`: Electron app lifecycle, windows, tray, global shortcuts, native integrations, DB entrypoints
- `preload`: safe bridge only, expose minimal typed APIs with `contextBridge`
- `renderer`: React UI only, no direct Node.js access

Never let the renderer call Node or OS APIs directly.

Always prefer:

- `contextIsolation: true`
- `nodeIntegration: false`
- narrow preload APIs

## Data Rules

Default to SQLite for persistent data.

Use structured tables/models for:

- categories
- cards
- security settings
- app settings
- recent usage / statistics if added

Treat cards as a unified model with a `type` field such as:

- `website`
- `app`

Prefer stable typed interfaces shared across renderer, preload, and main where appropriate.

Avoid using ad-hoc JSON blobs for core structured business data unless there is a strong reason.

## Electron Integration Rules

When implementing Electron features:

- open websites through the system browser
- open desktop apps through the main process
- keep tray logic in main
- keep global shortcut registration in main
- keep lock/unlock state coordinated through preload-safe APIs

When adding a capability, ask:

1. Does this belong in `main`?
2. Does preload need to expose it?
3. What is the minimum typed renderer API needed?

## Frontend Rules

Use React functional components and TypeScript throughout.

Prefer:

- small presentational components
- feature-based component grouping
- explicit props typing
- Zustand for app state
- Tailwind utilities plus CSS variables for themes/tokens

Do not overuse global state. Keep local UI state local unless it is shared.

Prefer clean component naming such as:

- `CategorySidebar`
- `CardGrid`
- `QuickAccessSection`
- `LockScreen`
- `AddCardModal`

## State Management Rules

Use Zustand for:

- selected category
- card list cache
- modal visibility
- search state
- settings state
- lock state if UI-level sharing is needed

Do not move DB persistence logic into Zustand stores. Stores coordinate UI state; persistence belongs to services/repositories in the Electron layer.

## Styling Rules

Use Tailwind for layout and utility styling.

Use CSS variables for:

- colors
- radius
- shadow
- glass backgrounds
- spacing tokens if needed

Do not hardcode inconsistent shadows, border radii, or colors across many files.

Prefer one shared design-token layer.

## File and Module Design

Keep the codebase modular and readable.

Preferred logical areas:

- `src/main`
- `src/preload`
- `src/renderer`
- `src/shared`
- `src/renderer/components`
- `src/renderer/features`
- `src/renderer/stores`
- `src/renderer/pages`
- `src/main/services`
- `src/main/db`

Keep shared types in a common area when they are used across process boundaries.

## Naming Rules

Use clear English code identifiers even when the UI is Chinese.

Examples:

- `CardType`
- `DesktopAppCard`
- `WebsiteCard`
- `SecuritySettings`
- `openExternalUrl`
- `launchDesktopApp`

UI copy can be Chinese; code symbols should remain consistent and maintainable.

## Security Rules

Treat security as first-class.

Always:

- hash passwords, never store plaintext
- keep OS-level actions inside the main process
- validate app paths before launching
- validate URLs before opening
- expose only the minimum preload surface

Do not embed secrets in the renderer.

## Search and Interaction Rules

Search is a core feature, not a decorative feature.

When implementing search:

- support categories
- support cards
- support URL/path matching
- keep result ranking predictable

When implementing future quick summon / command palette:

- make it fast
- keyboard-first
- low-latency
- focused on direct action

## Coding Workflow

Before editing:

1. Inspect the current structure
2. Find the relevant modules
3. Understand existing patterns
4. Extend the codebase instead of fighting it

When editing:

- keep diffs focused
- do not rewrite unrelated files
- do not introduce a second pattern when one already exists
- preserve user changes

After editing:

1. Run the most relevant verification possible
2. Check for type errors
3. Check for broken imports
4. Confirm the feature flow end to end if feasible

## Review Rules

When reviewing code for this project, prioritize:

- process-boundary safety
- incorrect main/preload/renderer separation
- insecure Electron usage
- broken local persistence assumptions
- UI regressions against the agreed design direction
- missing typing
- unclear or unstable data flow

Treat residual risks explicitly.

## Change Discipline

Prefer incremental delivery.

Default delivery order:

1. shared types
2. persistence/service layer
3. preload contract
4. renderer integration
5. UI refinement
6. verification

Avoid mixing major visual redesign, data migration, and native integration changes into one patch unless necessary.

## What to Avoid

Do not:

- add a web backend for local-only features
- call native APIs from the renderer
- scatter SQL across random UI files
- introduce inconsistent UI styles
- convert the interface into an admin-system aesthetic
- overcomplicate the first version with cloud-only assumptions

## Output Expectations

When implementing work under this skill:

- keep architecture decisions explicit
- use concise comments only where needed
- prefer maintainability over cleverness
- leave the project easier to extend than before

If a requested change conflicts with these standards, call out the tradeoff clearly before proceeding.

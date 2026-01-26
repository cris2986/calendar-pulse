# Architecture Freeze & Rules

## 1. Folder Structure
- **src/core/**: Pure TypeScript logic only. NO React, NO UI components.
  - Must be testable with `vitest` in Node/JSDOM environment.
  - Contains: parsers, state machines, matchers, types.
- **src/db/**: Database layer (Dexie/IndexedDB).
  - Singleton instance.
  - Handles migrations and schema definitions.
- **src/features/**: Feature-specific logic (glue code).
  - Can import from `core` and `db`.
  - Examples: `ingest`, `calendar`, `notifications`.
- **src/components/**: Reusable UI components (Shadcn UI).
- **src/pages/**: Page-level components.

## 2. Global Providers
- **Strict Layering**:
  1. ErrorBoundary (Outer)
  2. Instrumentation/Diagnostics
  3. ThemeProvider (if applicable)
  4. ConvexProvider (Optional/Conditional)
  5. Router
  6. App Content
- **No "God Providers"**: Avoid creating a single provider that wraps everything unless necessary for global state that cannot be handled otherwise.

## 3. Service Worker (PWA)
- **Development**: MUST be disabled to prevent caching issues during hot-reload.
  - `vite.config.ts` -> `VitePWA({ devOptions: { enabled: false } })`.
- **Production**: Standard caching strategies (NetworkFirst for API, StaleWhileRevalidate for assets).

## 4. State Management
- **Local State**: Use `useState` for component-level state.
- **Persistent State**: Use IndexedDB (Dexie) for data that must survive reloads.
- **No Redux/Zustand**: Unless complexity explodes (unlikely for this MVP).

## 5. Testing
- **Core Logic**: 100% coverage target for `src/core`.
- **UI**: Smoke tests for critical paths.

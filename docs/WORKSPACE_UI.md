# Compact workspace UI

The main Assets grid is the visual baseline for authenticated Buildflo workspaces. `src/app/workspace.css`, imported by `globals.css`, applies through `app-workspace` on the dashboard and vendor-portal content shells. New pages in these shells inherit the same sizing without duplicating module-specific overrides.

- Page titles: 24px; record titles: 16px; section headings: 16px; smaller section/dialog headings: 14px.
- Body default: 13px. Table text, labels, form fields and action controls: 12px. Existing secondary metadata/badges retain their smaller text.
- Tables: compact cells, neutral headers in sentence case, subtle dividers, alternate row backgrounds and blue hover states. Selected-row colors are retained.
- Controls: at least 36px tall on desktop and 44px on mobile or coarse pointers. Forms and button/link actions share the same sizing; checkboxes, radios, color controls and range controls keep native geometry.
- Panels: simple borders, 8px corners and consistent padding. Focus and selection use the existing blue application accent.

These are shared presentation rules, not changes to module permissions or business workflows. The request flow additionally uses shared components in `src/components/assets/asset-request-dialog.tsx` and `asset-request-picker.tsx`. Projects now has a page heading consistent with the other main lists.

The public site and authentication pages retain their own styling. Rich text (`.prose`), editable document content and descendants of `data-ui-density="preserve"` are excluded from the typography/table overrides. Add that attribute to authored document previews or spatial widgets whose dimensions must stay independent of application density. Do not use it as a general workaround for ordinary forms or tables.

Validation uses disposable local databases: `tests/platform.integration.test.ts`, `tests/asset-types-requests.integration.test.ts`, `e2e/asset-types-requests.spec.ts`, and the company deletion scenario in `e2e/platform-admin.spec.ts`. Browser coverage checks request submission in place, keyboard focus restoration, accurate widget counts, server pagination, representative module typography and desktop/mobile layouts. Visual artifacts remain local in `.impeccable/review/`.

The shared rules are a compatibility layer for existing module markup. For new interfaces, prefer semantic headings, native buttons/labels, an overflow container around wide tables and the existing compact control classes. Specialized workflows keep their layouts; shared sizing is not an assertion that every screen has been individually redesigned or visually reviewed.

Verified locally on 2026-11-05: 18 asset pagination/request/workspace browser tests and the company deletion browser scenario passed; 13 platform integration tests and 3 asset types/requests integration tests passed. TypeScript and whitespace checks passed. The company deletion suite includes authorization, MFA, typed confirmation, platform-account protection, populated dependency cleanup, rollback, access invalidation and audit preservation. No production mutation or deployment was performed.

# Change-order editing, notes and history — September 29, 2026

## Delivered behavior

- Draft and pending change orders support editing title, description, reason and line items, including quantities, units, rates, credits, cost codes, spec sections and line notes. Amounts are calculated on the server; zero is valid. Existing line IDs are retained when editing.
- Approved change orders retain their approved content and amount while a proposed revision is edited. The detail view shows the approved and proposed values and their difference. Editing a pending/rejected revision returns that revision to draft.
- Revisions must be submitted before approval. Approval atomically replaces the existing approved amount rather than adding another change order to the contract. Rejection or discarding leaves the approved value unchanged. Discarded/replaced revision content remains in update history.
- Dated, append-only notes identify their author. Notes are available at every status. Corrections can be added as new notes.
- Update history records creation, edits, submissions, approvals, rejections, returns to draft, revision changes and notes. It captures actor name/ID, server timestamp and before/after snapshots, including line items. The interface displays readable old/new values.
- History starts with this release. Earlier actions are not reconstructed; the first new action on a legacy order captures its existing state as the before snapshot.
- Approved records cannot be deleted. Draft deletion remains available and removes that unapproved draft's notes/history. A restrictive contract foreign key also prevents deleting a parent contract/vendor from cascading away change orders. Contracts with draft orders require those drafts to be removed first.
- Number allocation and mutations are serialized per contract. Content/status/deletion requests require a matching integer `version`; stale requests return 409. Adding a note is append-only and does not require a version. All routes enforce company boundaries, including cost-code references.
- Existing direct draft approvals remain available under the application's existing access rules. No new approval role or external approval invitation flow was introduced.
- Generated documents continue to use the effective order; while a revision is open, the interface explicitly labels document output as the current approved order.

## API compatibility

`PATCH /api/contracts/:id/change-orders/:coId` accepts `version` and one action:

- `edit` (default): content fields; approved orders create/update a proposed revision.
- `status`: existing order status transition, without content edits in the same request.
- `revision-status`: proposed revision transition.
- `discard-revision`: remove the proposal, preserving its history.
- `note`: a nonblank `body`, without a required version.

The existing line-item endpoints use the same transactional workflow and history. They require `version` in POST/PATCH bodies or DELETE query parameters, and reject writes to approved orders with an instruction to create a revision. Change-order DELETE also requires a version query parameter. Clients must reload after mutations to obtain the new version.

## Migration and rollout

Migration: `20260929120000_change_order_workflow`.

Adds version/revision fields, `ChangeOrderNote`, and `ChangeOrderEvent`. Changes the contract foreign key from cascade deletion to restrict. It does not backfill or recalculate existing contract/change-order/payment amounts.

**Implemented locally; not deployed and not applied to production.** Deploy the migration and regenerate Prisma Client with the corresponding application release. Older open browser sessions need to reload because mutations now require versions.

The migration was applied successfully to the pre-change schema in a dedicated local test database. The repository's previously documented inability to bootstrap its full historical migration chain on an empty database is outside this change.

## Verification

Passed: all 12 checks across `e2e/change-order-workflow.spec.ts` (8) and `e2e/contract-calculations.spec.ts` (4), TypeScript checking, Prisma schema validation and whitespace checks. Desktop and 390px mobile screenshots were inspected. The migration was exercised against the pre-change schema on the disposable local database.

The dedicated suite covers draft/pending edits, credits and zero, notes, before/after history, revision rejection/rework/discard/approval, effective contract and payment values, concurrent saves and numbering, stale approvals, invalid content, authentication/company isolation, cost codes, line-item API protection, parent deletion protection, and desktop/mobile browser workflows with refresh persistence.

Run only against the disposable local database:

```sh
# Start the application with this same DATABASE_URL and a local test JWT_SECRET.
DATABASE_URL=postgresql://USER@127.0.0.1:5432/change_order_workflow_verify \
CHANGE_ORDER_TEST_DB=1 PLAYWRIGHT_SKIP_WEB_SERVER=1 \
npx playwright test e2e/change-order-workflow.spec.ts e2e/contract-calculations.spec.ts --workers=1
```

The suite rejects other database names/hosts. Do not run fixture-creating tests against customer data.

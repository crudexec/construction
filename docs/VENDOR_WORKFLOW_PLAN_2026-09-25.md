# Vendor workflow changes — September 25, 2026

## Agreed scope and local implementation

1. **Contacts belong to one company at a time.** The company Contacts tab supports opening a person's own details, adding/editing contacts, notes, primary/billing designations, and explicitly moving a contact to another company. Contact IDs, comments and historical milestone references are preserved. Moving clears primary/billing designations rather than replacing the destination's primary contact. Primary updates are serialized; stale edits are rejected when an update timestamp is provided.
2. **Suppliers/subtiers link to vendor company records.** From a company or contract, select an existing vendor or create a vendor and supplier association together. New company creation and optional contract attachment are transactional. Matching names are suggested; an exact case-insensitive duplicate requires explicit confirmation. No automatic merging, portal credentials, user accounts or invitations are created. Names link to the corresponding vendor page.
3. **Clearer contract summaries.** Both the company overview and Contracts tab show contract number/title, status, all linked jobs, original amount, approved changes, current value, retention percentage/calculated amount, and separate estimate amount/reference. A zero estimate stays visible. Detail summaries distinguish calculated contract retention from retention held on paid applications, complementing the previous contract editor and return-to-project links.

## Existing records and safeguards

- Existing suppliers are not guessed or bulk-merged. Use **Link vendor company** on the vendor overview to associate a legacy supplier with an existing/new company.
- Linking preserves the supplier's original ID, name and existing contract/lien-release references. Conflicting existing associations are rejected for manual review.
- Removing an unused supplier association does not delete its linked vendor company. Associations referenced by contracts or lien releases cannot be deleted; contract supplier links with lien releases cannot be removed.
- Company boundaries and authentication are enforced on all added workflows. The vendor-choice endpoint returns only IDs and names, not portal fields.
- Moving a person does not reassign their historical projects/contracts. It does not create or move a login account.

## Rollout status

Implemented locally; **production migrations applied September 25, 2026; application deployment remains pending**.

New additive migration: `20260925160000_vendor_relationships` adds nullable contact notes, a nullable supplier-to-vendor reference, its foreign key and indexes. It does not rewrite existing rows. Tested locally and subsequently applied to production with explicit user approval.

The preceding `20260925120000_contract_details` migration was applied at the same time. All 25 repository migrations are applied, with matching checksums and none pending. Deploy compatible application code and generate the Prisma client during deployment; no application deployment/restart was performed in this database-only step.

Pre-migration private data/schema-column snapshot: `/private/tmp/buildflo-production-migration-VXxBnt/before.json` (directory mode 0700, file mode 0600). Post-migration comparison preserved every existing field and row across 20 contracts, 14 vendor contacts, 8 suppliers, 6 contract-supplier links, 18 lien releases, 0 contact comments and 26 project milestones. Verified all six new columns, both supplier indexes and the validated `ON DELETE RESTRICT` foreign key. This is an affected-table snapshot, not a full database backup.

The separate change-order editing/revision/notes/history batch remains outstanding. See [contract/payment plan](CONTRACT_PAYMENT_PLAN_2026-09-25.md).

## Verification

All 22 tests passed across `e2e/vendor-relationships.spec.ts` (8), `e2e/contract-details.spec.ts` (4), `e2e/contract-calculations.spec.ts` (4), and `e2e/aca-pay-app.spec.ts` (6). Coverage includes contact add/edit/move, concurrent primary selection, tenant isolation, no-login supplier creation, duplicate checks, atomic contract attachment, preservation of legacy references, clickable supplier links, and contract financial summaries. Prisma schema validation, TypeScript checking and whitespace checks passed.

All database-backed tests must use an explicitly disposable local database. The vendor suite requires `VENDOR_TEST_DB=1`, localhost, and the expected test database name. Never run fixture-creating tests against customer data.

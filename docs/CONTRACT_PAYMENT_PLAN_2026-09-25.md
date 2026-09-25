# Agreed contract and payment changes — September 25, 2026

## Decisions confirmed with the user

1. Contract pages link back to the associated project's Vendors/Contracts tab, including after refresh or direct navigation. Vendor navigation remains separate. For contracts with multiple linked projects, expose each project rather than guessing the origin.
2. Edit Contract covers start/end dates, calculated duration, original amount, estimate reference and amount, retention percentage, contract number, title, description, and existing terms/notes/bond fields. Dates affect only the contract, not tasks or payments. Duration is elapsed calendar days (end minus start); an unknown end date gives no duration.
3. Estimated amount is separate from the original contract amount. Null means not supplied; zero is valid. Changing an estimate does not change contract/payment values.
4. Current contract value is original amount plus approved change orders, read-only. An explicitly edited original amount is protected from later line-item auto-recalculation; item totals remain available separately. Existing contracts retain automatic line-item calculation until their original amount is explicitly changed.
5. Max Payment is **current contract value less retention calculated on that value**. It does not subtract previous payments or depend on this application's subtotal. It is not an application-specific remaining-payment allowance.
6. Previously Held Retention shows retention held on earlier paid applications, excluding the application being viewed/edited and any later, unpaid or voided applications. This application's retention is displayed separately. The contract-wide total is labeled Total Retention Held (Paid).
7. Use consistent grid/form labels, two-decimal currency formatting and right-aligned monetary values. Brian's additional visual preferences still need acceptance.
8. Change orders are a separate next batch: edit drafts/pending orders; revisions to approved orders require approval, preserving the previous approved amount until replacement approval; add dated notes and old/new-value actor/timestamp history; preserve approved history against deletion.

## First implementation batch

Items 1–7 are implemented locally. Includes strict server-side contract field/date validation, optimistic conflict checks, nullable estimates/end dates, server-derived Max Payment on payment writes, and stable payment ordering for older/same-date application previews.

The change-order revision/history workflow (item 8) is **not implemented in this batch**.

### Compatibility and rollout

- Additive migration: `20260925120000_contract_details` adds optional estimate reference, title, description, and a default-false manual-original-value flag.
- No historical payment rows or customer contract values are backfilled or rewritten.
- Existing stored retention balances continue through the legacy calculation's compatibility rules; this batch fixes which application's prior balance is displayed, rather than guessing a new interpretation of historical cumulative versus incremental fields.
- New UI payment previews preserve the edited application's creation timestamp and use its chronological position, not the latest payment as their starting point.
- Submitted Max Payment overrides are ignored on writes; the server calculates the agreed value. The UI recalculates from current contract terms when viewing older rows. No new per-application approval cap was introduced.
- Migration was tested on an isolated local database, then **applied to production September 25 with explicit user approval**, together with `20260925160000_vendor_relationships`. All 25 migrations are applied with matching checksums. Existing contract fields and rows were preserved; see the [vendor rollout verification](VENDOR_WORKFLOW_PLAN_2026-09-25.md). Application deployment remains pending; generate the compatible Prisma client during deployment.
- Pre-existing Fleetio import work in the same worktree is preserved. Its September 24 migration was already applied remotely; this new migration is separate.

### Verification

All 14 tests passed across `e2e/contract-calculations.spec.ts`, `e2e/contract-details.spec.ts`, and `e2e/aca-pay-app.spec.ts`. TypeScript and whitespace checks passed. Tests cover zero/null estimates, invalid dates/amounts, stale saves, tenant isolation, line-item changes after manual original edits, navigation, date persistence, max-payment override prevention, chronological retention previews, and existing ACA payment/lien-release workflows.

Run database-backed tests only against an explicitly disposable local database; the contract details suite checks `CONTRACT_TEST_DB=1`, localhost and the expected test database name. Never point existing fixture-creating ACA tests at customer data.

# Client feedback delivery plan — September / October 2026

Prepared September 21, 2026, from the client's email. Dates below are proposed delivery targets, subject to effort estimates and team capacity; they are not delivery commitments. This plan covers the email's requests, with implementation and client acceptance still to come.

September 25 update: the user clarified contract editing, estimate fields, Max Payment, and retention behavior. The [agreed contract/payment plan and implementation status](CONTRACT_PAYMENT_PLAN_2026-09-25.md) supersede the open questions for those items below. The core batch is implemented locally and its production migration is applied; application deployment and client acceptance are pending. Change-order revisions/history remain the next separate batch.

September 25 vendor update: company contacts, supplier/vendor linking and clearer contract summaries are implemented locally, and the production relationship migration is applied and verified. See the [vendor workflow scope and rollout notes](VENDOR_WORKFLOW_PLAN_2026-09-25.md). Application deployment remains pending; legacy supplier associations are linked explicitly rather than automatically merged.

## Implementation progress — September 21

First implementation batch is available locally; deployment and client acceptance remain outstanding.

| Item | Local implementation | Verification |
| --- | --- | --- |
| A1 — Equipment Issues within Assets | Removed the main navigation entry; added Equipment Issues and Work Orders links to Assets, a return link on the issues dashboard, and active Assets navigation on nested pages. | Mocked browser navigation test passed. |
| A3 — Overview tiles | Added open-issue count/drill-down, latest hours and miles with dates, and a “+” action that opens the meter-read form. Issue mutations refresh the overview count and readings. Same-date readings use creation time to break ordering ties. | Mocked browser tests cover latest values, adding a reading, resolving an issue, and empty states; desktop screenshot inspected. |
| A6 — One operational status selector | Create/edit forms now offer company and standard statuses in one selector while preserving the underlying base-status mapping. Switching to a standard status clears the custom selection. Existing inactive selections remain visible and may be retained on the same asset. | Mocked browser tests cover create/edit payloads, switching back to a standard status, and displaying an inactive current selection. |

Validation: `npx tsc --noEmit --incremental false`, four tests in `e2e/asset-feedback-ui.spec.ts`, and `git diff --check` passed. UI tests intercept all API requests; database-backed integration checks and client acceptance have not been run. The existing database is remote and was not modified. Existing person-assignment and issue-attachment work was preserved.

## Implementation progress — September 22

Second application batch is implemented locally. The two pending asset migrations were applied to the authorized remote database; application deployment and client acceptance remain outstanding.

| Item | Implementation | Verification |
| --- | --- | --- |
| A2 — Category and dashboard filtering | Optional Category on creation/editing, with suggestions from existing assets of the selected type and support for new category text. Category column and sorting on the dashboard; case-insensitive category filtering combines with type and status. Changing type in a form clears the old category for reselection. | Local database/API checks confirm company/type isolation and combined filters; browser test covers creation, editing, filtering, and clearing. |
| A8 — Equipment ID | Editable, optional first-class ID appears first in the form and dashboard, in the asset header, issue links, requests, and work-order issue selection. Search matches ID without case sensitivity. Entered IDs are trimmed, limited to 100 characters, and unique per company (case-sensitive uniqueness); blank values are stored as null. The internal record ID remains unchanged. | Local database/API checks cover duplicate create/update rejection, reuse across companies, blank/omitted/invalid values, and preservation of record IDs. Browser test covers create, search, edit, reload, and clear. |

No automatic conversion of custom-field IDs or categories was performed. Existing records may remain unclassified until edited; any backfill from custom fields requires a reviewed mapping. Category suggestions are derived from existing asset records, not a separate category-administration module. Configurable field ordering (A9) remains separate work.

**Remote migration result:** `20260819120000_asset_person_assignments_issue_attachments` and `20260921120000_asset_equipment_id_category` applied successfully. The changes add person-assignment history and issue-attachment tables, permit a missing recorder for QR-submitted meter readings, and add Equipment ID/category columns with indexes. A private snapshot of the affected tables/schema was saved at `/private/tmp/buildflo-asset-test.jjAziC/remote-asset-snapshot.json` before applying the migrations. Post-migration comparison confirmed all 10 pre-existing asset rows and all 3 meter-reading rows retained their original field values.

**Validation:** Prisma generation/schema validation, TypeScript checking, whitespace checks, and seven focused Playwright tests passed: four mocked UI regression tests and three tests against a disposable local PostgreSQL database, including a real create/edit/search/filter UI workflow. The Equipment ID/category migration was also applied to a pre-change local schema containing a legacy asset, whose identity/name were preserved. Desktop dashboard screenshot inspected. No test fixtures were written to the remote database.

**Existing setup issue:** replaying the entire repository migration history on an empty local database fails at `20260428171052_add_lien_release_management` because `DocumentTemplateType` is absent. This predates the asset work; the remote database already had that migration completed, so the two pending migrations applied normally. The historical migration gap was not changed in this batch.

### Third batch — structured assignment/location and meter-read context

A4/A5 are implemented locally, and migration `20260922120000_asset_location_meter_context` has been applied to the authorized remote database. Application deployment and client acceptance remain outstanding.

| Item | Implementation | Verification |
| --- | --- | --- |
| A4 — Assignment and Location | Assignment means a person; Location selects a job or company equipment yard. Create/edit forms use independent selectors, including inline yard creation. Transfers update current details and close/open history periods atomically. Separate Locations and Assignments tabs retain historical periods. Request approvals/returns use the same context update logic. | Database/API tests cover company isolation, independent clearing, historical entries, concurrent transfers, and request approvals/returns. Browser tests cover job/person selection and a subsequent yard transfer. |
| A5 — Meter-reading context | Readings capture immutable person/location IDs and labels, with routine, arrival, or departure events. The form defaults to current details and displays both on the reading list. An explicit checkbox also updates current asset details; otherwise a reading does not move or reassign the asset. Internal issue and public QR readings capture context without exposing private assignment data in the public response. | Tests verify retained snapshots after transfers/renames, explicit current updates, invalid input rollback, legacy readings, issue/QR entry points, and the real browser arrival/departure workflow. |

Existing free-text locations remain visible until deliberately mapped to a job/yard; they were not guessed or discarded. Existing readings display context as “Not recorded” rather than inheriting today's details. Backdated readings can capture historical context, but the optional current-details update takes effect now. Person/location changes alone do not change operational status; approval/return workflows retain their explicit status transitions. Unified asset History (A7) is still separate work.

**Remote migration result:** migration applied successfully and Prisma reports the schema is up to date. The pre-migration snapshot is stored privately at `/private/tmp/buildflo-asset-test.jjAziC/remote-context-snapshot.json`. Comparison verified every original field on existing assets, meter readings, and assignment/location history was preserved, including all 10 assets and 3 meter readings. No test fixtures were written to the remote database.

**Validation:** Prisma schema validation, TypeScript checking, whitespace checks, and 16 focused Playwright tests passed across targeted runs: seven context integration/browser tests, three identity integration/browser tests, four mocked UI regressions, and two existing asset-management browser regressions. Integration tests used disposable local PostgreSQL. The meter-reading context screenshot was inspected.

### Fourth batch — asset History (A7)

Implemented locally: a History tab combining purchase dates, meter readings, person assignment starts/ends, job/yard location starts/ends, issue reports/resolutions, and linked work-order creation/completion. Users can filter by the six event types, sort newest/oldest first, page through events, and follow related-record references. CSV export includes every matching event in the chosen order, not only the visible page, with asset identity, UTC dates, actors, context, and source IDs/links. Purchase dates remain date-only. CSV quoting preserves multiline text, and formula-like cell values are escaped for spreadsheet safety.

History is a read-only projection of retained records, not a new immutable audit log. It does not invent purchase dates, actors, legacy meter context, or previously unrecorded edits. Meter context and saved location names remain snapshots; other source details reflect their current values. Deleted records, reopened issue resolutions, and removed work-order links may be unavailable. These limits are disclosed in the tab. Work orders linked through multiple issues on the same asset appear once per event, and both the asset and work orders are company-scoped.

No database migration or remote data change is required for this batch. Application deployment and client acceptance remain outstanding.

**Validation:** TypeScript and whitespace checks passed. All 20 focused Playwright tests passed against the disposable local PostgreSQL database and mocked APIs: six new history tests plus fourteen earlier asset regressions. Coverage includes all six event types, company isolation, unknown actors, deleted-job snapshot preservation, work-order deduplication, date sorting, filters, pagination, CSV downloads across pages, formula escaping/multiline round-trips, related-record navigation, refresh after changes, error/retry handling, and empty states. Desktop and mobile screenshots were inspected.

### Fifth batch — company-wide asset field ordering (A9)

Implemented locally: admins can open **Arrange fields** from asset creation, Overview, or Purchase; move standard and custom fields up/down; save the company-wide order; or reset to defaults. The create/edit forms and overview use the same ordered field registry, so custom fields can appear between standard fields. The Purchase tab follows the same order for its subset of fields. Overview skips empty values. This is one company-wide layout, not personal or per-role layouts.

New definitions append automatically; deleted definitions are ignored. Inactive definitions retain their position and existing values remain visible read-only. Moving, cancelling, or resetting the layout does not modify asset values or discard in-progress form values. API writes require an admin and an exact list of that company's fields. Version checks reject stale saves/resets, with an explicit reload/retry workflow rather than silently overwriting another admin's changes.

The shared create form now supports the existing purchase/financing fields and active custom-field inputs. These additional create values are validated and saved with the asset in a single transaction; invalid custom fields or foreign-company references do not leave partially created assets. Existing custom-status behavior, assignments/locations, purchase editing, and field values are preserved.

**Remote migration result:** `20260922160000_asset_field_layout` applied successfully. It adds only the per-company layout settings table; no existing asset fields were backfilled or rewritten. Prisma reports the remote schema is up to date. The private pre-migration snapshot is at `/private/tmp/buildflo-asset-test.jjAziC/remote-layout-snapshot.json`. Comparison verified existing rows were unchanged: 10 assets, one custom-field definition, four meter readings, and one job/location assignment (the custom-value and person-assignment tables were empty). No test fixtures were written remotely. Application deployment and client acceptance remain outstanding.

**Validation:** Prisma generation/validation, local schema comparison, TypeScript, and whitespace checks passed. The final 26-test asset regression run passed, plus two existing full asset-management browser workflows in targeted runs (28 distinct tests total). New coverage verifies tenant/admin restrictions, exact field lists, concurrent/stale saves, reset, new/inactive/deleted definitions, atomic custom-value creation, mixed-field ordering across create/edit/overview, preserved drafts, staff visibility, loading-error recovery, and conflict reload. Desktop overview and mobile editor screenshots were inspected.

Remaining asset work: role/access documentation (R1) and release/acceptance verification. Project/vendor work remains as listed below.

## 1. Milestones and priorities

| Target | Outcome | Acceptance checkpoint |
| --- | --- | --- |
| September 23 | Asset scope, risks, and role visibility documented | Review remaining work and demonstrate available asset workflows before the client's September 24 notice deadline. |
| September 24 | Client has evidence for their 30-day notice decision | Provide readiness assessment, open blockers, and a credible September 30 delivery forecast. The notice decision remains the client's. |
| September 28 | Asset feature work ready for acceptance testing | All asset requests below implemented in a test environment, including agreed history and field-ordering scope. |
| September 29–30 | Assets accepted and ready for use | Complete client walkthrough, fix blocking defects, verify existing records, and provide a short usage guide. |
| Around September 28 | First pay-app feedback checkpoint | Collect findings from the client's planned week of testing; confirm the actual review date. |
| October 1–9 | Project and vendor essentials complete | Navigation, contract editing, payment corrections, contacts, supplier links, and contract dashboard verified. |
| October 12–14 | Onboarding and final acceptance buffer | Run realistic workflows with intended user roles; resolve blockers before mid-October use. |
| After the core release; date to estimate | Expanded change-order functionality | Editable change orders, notes, and update history, with agreed rules for approved records. |

September 30 is the requested asset deadline. October 9 is a proposed internal target that leaves a buffer before mid-October. September 24 is an earlier business decision checkpoint, not a substitute asset completion date. Confirm any data export, migration, or overlap requirements associated with the notice period separately.

Priorities: **P0** = notice/readiness or asset deadline; **P1** = essential before mid-October; **P2** = explicitly noncritical follow-up. P2 does not defer defects that corrupt contract or payment values.

## 2. Roles and visibility

**R1 — Publish a role/access matrix. Priority: P0 for documentation; access gaps must be resolved before the affected release.**

- Inventory actual access for Admin, Staff, Subcontractor, Client, and the separate vendor portal. Confirm which roles the client intends to use and whether “tiers” means these roles or something additional.
- Cover Assets, issues, meter reads, assignments/locations, Projects, Vendors/contacts, contracts, change orders, pay apps/payments, reports/exports, and settings.
- For each role, show what users can see, create, edit, approve, delete, and export, plus whether access is company-wide or limited to assigned records.
- Distinguish current behavior from requested behavior and list gaps. Verify representative screens and API access; hidden navigation alone does not establish a restriction.
- Deliver a concise client-facing guide and verify affected workflows using representative accounts before onboarding.

**Done when:** the client can identify what each intended user type sees and does, and documented permissions match verified behavior. Do not invent a new permission policy from the email.

## 3. Assets — due September 30

All items in this section are P0. Establish the identity/location model first because meter reads and history depend on it.

| ID | Work item | Acceptance criteria |
| --- | --- | --- |
| A1 | Move Equipment Issues into Assets | Remove its top-level navigation entry; provide an obvious Issues entry within Assets. Keep asset-specific issues and Work Orders reachable, and preserve existing direct links. |
| A2 | Add asset Category under Type | Users can select a category when creating/editing an asset and filter the asset dashboard by category alongside type. Support the client's Type → Category structure; confirm the actual category list and mappings. Existing assets remain usable without a category. |
| A3 | Add overview tiles | Show open issues with a count and a link to the underlying issues. Show latest meter readings with units/date and a “+” action to add a reading. Counts/readings refresh after changes; empty states are clear. |
| A4 | Standardize Assignment and Location | “Assignment” consistently means a person. “Location” consistently means a job/project or equipment yard. Replace the overview's free-text Location editor with structured selection. Keep person and location independent, and preserve existing assignment/location information during migration. |
| A5 | Add context to meter reads | Add person Assignment and job/yard Location fields to the meter-read form, defaulted from the asset where appropriate. Display both on the meter-read list/dashboard. Support readings when equipment arrives at or leaves a job. Preserve the context at the time of the reading when the asset later moves. |
| A6 | Simplify status editing | Present one operational Status selector. Keep any base-status mapping required for filtering/reporting behind the scenes. Existing custom statuses continue to work and users do not have to reconcile two competing status fields. |
| A7 | Add asset history | Provide a History tab with chronological events, date sorting, and filtering by event type. Cover purchase, meter reads, person assignments, job/yard moves, issues, work orders, and subsequent tracked changes. Include dates, event type, details, actor where known, and related record references. CSV is an acceptable first delivery format, per the email. |
| A8 | Make Equipment ID editable and prominent | Add or expose a first-class, editable Equipment ID. Use it prominently in the asset header/list and relevant selectors, and allow searching by ID. Preserve the internal record key and existing links. Agree how to handle blank/duplicate IDs and existing IDs stored in custom fields. |
| A9 | Allow field ordering | Let the appropriate user configure and save field order so Equipment ID can appear where the client expects. Confirm whether custom fields must interleave with standard fields and whether ordering is shared or personal; reordering custom fields only may not satisfy the request. |

**Implementation decisions to settle early:**

- Job and yard representation, including how existing free-text locations map to structured records. Preserve unmatched values for review rather than silently dropping them.
- Whether changing person/location while logging a reading also changes the asset's current assignment/location. Make that action explicit and save related changes consistently.
- Whether arrival/departure needs an explicit event field or can be captured through the movement workflow.
- Scope of field placement for A9. Keep this in the September asset scope unless the client agrees otherwise.
- History delivery: a table with CSV export is the preferred target; a CSV delivered from the History tab is the lower-effort option expressly allowed by the client. CSV must support chronological review and filtering by type in a spreadsheet. Do not claim complete historical coverage where past changes were never recorded; backfill from reliable records and label unknown information.

**Asset acceptance walkthrough:** find an asset by Equipment ID → filter by category → assign a person and select a job → record an arrival reading → move it to a yard and record a departure reading → verify old reading context → create/resolve an issue → check overview tiles and history. Include custom status and saved field-order checks.

## 4. Projects and contracts — target October 9

| ID | Priority | Work item | Acceptance criteria |
| --- | --- | --- | --- |
| P1 | P1 | Return from vendor contract to project | Provide an explicit link/breadcrumb to the associated project, returning to its Vendors/contracts context where practical. Works after refresh or direct navigation as well as when entering from the project. |
| P2 | P1 | Edit contract duration | Make the intended duration/start/end fields editable and persistent. Confirm whether duration is entered directly or derived from dates, and validate consistency. |
| P3 | P1 | Edit contract estimate and allow zero | Clarify whether “estimate number” means the estimate amount, a reference number, or both. Implement the agreed fields and accept an explicit $0 amount without treating it as missing or replacing it with another value. Preserve the distinction between estimate and contract value. |
| P4 | P1 | Correct maximum payment behavior | Reproduce the client's failing example and agree the expected result. Check create/edit flows, previous payments, approved change orders, retention, and voided records as relevant. Verify UI and server validation against the same agreed examples. |
| P5 | P1 | Correct retention held display | Distinguish retention held before the current pay app from retention attributable to the current pay app. The prior-held figure excludes the current application, including while editing it. Validate with successive applications and agreed examples. |
| P6 | P1 | Apply payment formatting requests | Capture the exact requested labels, number/date formatting, columns, and layout adjustments during client review; implement and verify the agreed list. |
| P7 | P2 | Expand change orders | Scope editing, notes, and update history. Record who changed what and when. Decide how draft versus approved orders may change and how revisions affect contract totals; preserve an auditable record. Estimate and schedule separately after core readiness work. |

Payment defects already reported should be investigated before the client finishes broader pay-app testing. The checkpoint is for additional feedback and expected examples, not a reason to postpone known issues. These are software acceptance requirements; payment formulas still need confirmation against the client's workflow.

## 5. Vendors — target October 9

| ID | Priority | Work item | Acceptance criteria |
| --- | --- | --- | --- |
| V1 | P1 | Open specific company contacts | From a vendor/company, select a contact and see that person's own details. Verify the client-visible workflow with multiple contacts at one company. |
| V2 | P1 | Add, edit, and move contacts | Create additional contacts, edit their details, and move a contact between companies. Preserve the person's identity and notes, retain appropriate historical associations, and update both companies' contact lists. |
| V3 | P1 | Make suppliers/subtiers linked vendors | Adding a supplier/subtier creates or links a vendor record and makes its name clickable from the vendor/contract interface. Offer an existing-record selection to avoid obvious duplicates. Preserve parent-vendor, contract, and lien-release relationships when linking existing supplier records. |
| V4 | P1 | Improve contract dashboard clarity | Clearly display vendor/company, contract header/status, job, contract number, retention, and estimate/original/change-order/current-value summaries. Verify existing implementation against the client's actual deployed view and close remaining gaps. |

For V3, the planning assumption is that “vendor account” means a vendor/company record. Confirm whether login access is also wanted; creation of a record should not implicitly send an invitation or grant portal access.

**Vendor/project acceptance walkthrough:** open a project → open its vendor contract → return to the project → edit duration and estimate, including $0 → open/add/edit/move contacts → add or link a supplier → open that supplier's vendor record → verify preserved contract/lien-release associations → run the agreed payment and retention examples.

## 6. Existing implementation to verify and reuse

This is a limited repository inspection, not runtime verification or confirmation of what is deployed:

- `docs/FEATURES_IMPLEMENTED.md` records earlier delivery of contacts, project-to-contract navigation, contract header/value summaries, supplier records, asset features, custom statuses, and pay-app work. Reconcile these claims with the client's experience and deployed version before classifying work as complete.
- The sidebar currently includes a top-level Equipment Issues entry, matching A1's requested change.
- The asset schema has a free-text current location and separate job/person assignment records. Meter readings currently lack person and job/yard context fields. A4–A5 therefore require persistence and historical-context work as well as UI changes.
- The asset schema does not currently expose a dedicated Equipment ID or category field. Custom-field definitions already have a sort-order field, which may help A9 but does not establish that placement is configurable in the UI.
- Supplier/subtier records currently exist separately from vendor records; V3 needs record linking and careful handling of existing contract/lien-release associations.
- The local working tree contains ongoing asset changes, including person assignments and issue attachments. Review and incorporate relevant work without overwriting it; its presence is not evidence of deployment or acceptance.

## 7. Execution order and release checks

1. **September 21–23:** assign an engineering owner and client acceptance contact for each workstream; estimate remaining work, check deployed versus local behavior, draft the role matrix, and resolve the asset model/field-order decisions. Start asset work and capture concrete payment/contact failures.
2. **By September 24:** share the notice-readiness assessment with a demo, itemized remaining work, risks, and capacity-backed forecast. Flag any September 30 scope risk before the notice deadline.
3. **Through September 28:** complete asset identity/category/location foundations, meter-read context, history, and overview/navigation/status/ordering changes. Independent UI tasks can proceed alongside foundational work if capacity allows.
4. **September 29–30:** run asset acceptance with realistic records and representative roles. Verify migrations preserve existing data, including unmatched legacy locations and assignment history. Resolve blocking defects before marking Assets complete.
5. **October 1–9:** complete project/vendor fixes and payment reconciliation. Finalize dashboard presentation after underlying values and links are verified. Add newly reported pay-app work to an explicitly prioritized list; reassess the target if scope grows materially.
6. **October 12–14:** conduct the onboarding rehearsal and final regression checks, provide the role guide, and close remaining release blockers.
7. **After core acceptance:** deliver the separately estimated change-order improvements.

Each item is complete only when its acceptance criteria pass in the intended release environment. Use targeted automated coverage for calculation, authorization, historical-context, and relationship-preservation changes, plus client workflow checks for navigation and presentation. Verify backup/rollback readiness for data migrations and record the release version used for acceptance.

## 8. Questions to resolve without delaying independent work

1. Which role names and access boundaries should the visibility guide cover? Are “tiers” permission roles, subscription tiers, or both?
2. What must be demonstrated before September 24, and does the notice period introduce a separate migration or cutover deadline?
3. What Type → Category options and equipment yards are required? Does recording a movement also update current assignment/location?
4. What is the Equipment ID format/uniqueness rule, and should custom fields be placeable among standard fields? Is ordering company-wide or per user?
5. Does “contract estimate number” mean amount, reference number, or both? How should contract duration be entered?
6. Which concrete pay-app examples demonstrate the maximum-payment and retention problems, and what formatting changes are desired?
7. Does “vendor account” require portal login access, or only a linked company record?
8. What is the actual onboarding date, and who will accept the September and October releases?

These answers refine implementation and estimates. The email already supports prioritizing all asset requests for September, project/vendor essentials before mid-October, and the larger change-order expansion afterward.

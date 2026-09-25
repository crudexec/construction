# Allied Construction: maintenance and parts import

## Status

Committed September 24, 2026 at 17:03:50 UTC to Allied Construction, verified through active administrator `bdeller@alliedconstruction.net`. Post-commit verification completed at 17:03:54 UTC. Existing records and the five existing users were unchanged. No invitations, login accounts, maintenance performers, purchases, or project allocations were created.

The additive migration `20260924120000_fleetio_maintenance_import` is applied remotely. **Application code has not been deployed.** Deploy this revision with a regenerated Prisma client to expose the new imported service-history section, original work-order source details, direct asset links, and opening-stock snapshots. Existing work-order and inventory lists can show the imported parent records without these additional views.

## Imported

| Record | Added | Company total after import |
| --- | ---: | ---: |
| Work orders | 99 | 100 |
| Work-order / issue links | 82 | 83 |
| Imported service-history records | 204 | 204 |
| Inventory categories | 2 | 5 |
| Stocked part masters | 3 | 6 |
| Opening-stock transactions | 3 | 8 |

393 inserted database records. Work orders comprise 97 completed and two open, mapped to Scheduled. Their source status is retained. 251 work-order line items and 26 sub-line items are retained as structured, read-only source details on their work orders; these are not additional database rows or new charges.

Of the 204 service entries, 97 link uniquely to imported work orders and 107 are standalone service records. Original source fields, dates, notes, meter values, task details, authors and costs are retained. Source authors are labeled **Recorded by**, not treated as the people who performed the work. The work-order app creator is the importing administrator, explicitly identified as such in the description; the new UI displays the original creator separately.

## Cost and stock reconciliation

- All exported work orders have a recorded total cost of **$0.00**. These values were preserved, not recalculated from detail rows.
- Standalone imported service costs total **$11,897.36**. Combined historical maintenance costs use work-order totals plus only unlinked service entries; linked entries are not counted twice.
- Opening inventory value is **$5,839.98**. Opening-stock transactions represent a migration balance, not new purchasing expense or historical consumption.

| Part SKU | Description | Opening quantity | Source unit | Unit cost |
| --- | --- | ---: | --- | ---: |
| 1548978 | Battery | 13 | Unspecified | $150.00 |
| 111545 | Air Filter | 25 | Each | $150.00 |
| FIL 600451 | Fuel Filter | 2 | Each | $69.99 |

Four source location rows are preserved across the three parts. The fuel filter has zero at Farm and two at Kris' Shop; it is one part master, not duplicate parts. The battery export had no measurement unit, so it is explicitly unspecified rather than guessed. A blank quantity is never treated as zero.

Location quantities, aisle/bin information and reorder fields remain **opening snapshots**, not live per-location inventory. Subsequent stock movements use the application's existing material-level balance. The source details are read-only and labeled accordingly.

## Held records

| Source | Held | Reason / needed follow-up |
| --- | ---: | --- |
| Service entries | 4 | Refer to work orders absent from the supplied work-order export. Obtain those work orders before importing/linking these entries. |
| Work-order line items | 4 | Missing work-order number. Identify parent order. |
| Work-order sub-line items | 14 | Missing work-order number. Identify parent order. |
| Parts | 2 | Bolts and Welding Materials are marked untracked and have blank stock quantities; Bolts also lacks unit cost. Confirm stock tracking, quantity, location and cost as needed. |

Missing work-order references:

| Service Fleetio ID | Work order | Asset |
| --- | --- | --- |
| 34916048 | 38 | PU3 |
| 31876906 | 47 | FL3 - Sold |
| 31501235 | 43 | PU6 - Sold |
| 30853100 | 39 | PU6 - Sold |

Detail exports do not identify parent line items for sub-lines. Both detail arrays are preserved under the known work order without inventing line/sub-line nesting. All held rows remain in the untouched originals and private import archive.

Prior contact, tool-status, serial, vendor-link and historical-assignment exceptions remain unchanged; see the [earlier import report](ALLIED_FLEETIO_IMPORT_2026-09.md).

## Audit and implementation

- Receipt directory: `.import-reports/apply-YWhzM8/` (private, ignored by git).
- Digest: `aba3898a3bf3d03cb2ff54c52be5f0f77e0daad2998acc093542ee60b7a2450c`.
- Includes original CSV archive, pre-import snapshot, full plan/row dispositions, verified counts, commit receipt and post-commit verification.
- Import is insert-only, company-scoped, schema-checked and transactional. The resulting state generated zero operations on a repeat planning pass.
- `AssetServiceEntry` preserves imported history separately from native maintenance records, avoiding a fabricated logged-in performer. Linked work orders cannot be deleted while this history references them.
- Work orders have optional direct asset links, so no artificial issues were created. History queries include directly linked orders once, even where issue links also exist.
- The spreadsheet workflow's preservation rules drove the blank-versus-zero checks, raw source snapshots, explicit unknown units and held ambiguous references.

## Verification and rerun

Passed: 27 import-planning tests (including the supplied exports), a real PostgreSQL import/rollback test, nine browser/API tests (import screens, tenant isolation, linked-order deletion protection and asset-history regressions), type checking, and migration testing against the pre-change schema. The original full migration chain cannot bootstrap an empty database because an older migration references missing `DocumentTemplateType`; this pre-existing issue was not changed. The remote migration history already had all preceding migrations applied, so only this new additive migration was deployed.

Read-only preview:

```sh
node scripts/import-fleetio.cjs --client-followup --tools /path/to/fleetio-tool-export-2026-09-23.csv --maintenance
```

Any future writes require a new reviewed digest and `--apply --expect-plan <digest>`. Do not reuse the committed digest after the state has changed.

Tests:

```sh
FLEETIO_TOOL_EXPORT=/path/to/fleetio-tool-export-2026-09-23.csv node --test scripts/imports/fleetio-plan.test.cjs scripts/imports/fleetio-maintenance.test.cjs
# Requires disposable localhost database fleetio_maintenance_verify, never production:
FLEETIO_TEST_DB=1 FLEETIO_TOOL_EXPORT=/path/to/tools.csv DATABASE_URL=postgresql://.../fleetio_maintenance_verify node --test scripts/imports/fleetio-maintenance.integration.test.cjs
```

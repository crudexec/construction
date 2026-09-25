# Allied Construction Fleetio import

## Status

September 24: the **maintenance/parts batch is committed and verified**. See [Maintenance and parts import](ALLIED_FLEETIO_MAINTENANCE_2026-09-24.md) for 99 work orders, 204 service-history records, three stocked parts, remaining exceptions, and deployment requirements. Earlier batch tables below remain historical audit information.

September 23 follow-up: the tools/BL1 batch below is now committed. The first-batch tables and hold list below are retained as historical audit information; see **Follow-up batch** for the current changes and remaining exceptions.

First validated batch committed to the remote database on September 23, 2026 at 09:36 UTC. This is a **partial import**, not completion of every supplied export.

Target: Allied Construction, verified through active administrator `bdeller@alliedconstruction.net`. Existing account data was preserved. No users, invitations, portal credentials, synthetic projects, work orders, or maintenance performers were created. This batch required no schema migration or application deployment.

## Imported records

| Database record | Added | Company total after import |
| --- | ---: | ---: |
| Assets | 126 | 133 |
| Vendors | 90 | 95 |
| Vendor contacts | 5 | 10 |
| General contacts | 28 | 29 |
| Yards/service locations | 4 | 4 |
| Rental-rate snapshots | 100 | 100 |
| Meter readings | 937 | 941 |
| Asset issues | 202 | 204 |
| Location-history periods | 184 | 185 |
| Person-assignment periods | 2 | 2 |

Total: 1,678 inserted database records. The five existing users are unchanged.

## Held records and follow-up

| Source | Held | Reason / next step |
| --- | ---: | --- |
| `vehicles.csv` | 2 | Two different assets use `BL1 - Sold`. Confirm distinct Equipment IDs before importing either. |
| `meter_entries.csv` | 5 | Depend on the duplicated asset name. Resolve using original source identity, not the first matching name. |
| `issues.csv` | 23 | Refer to 14 missing tools. Obtain the tools export, including the tool used as a farm to-do list. |
| `contacts.csv` | 5 | Duplicate Bill Swartz and Kim Newsome identities, plus Guest User. Review identifiers before consolidating. |
| `vehicle_assignments.csv` | 32 | 26 have no matching app user, five otherwise-supported location rows lack a start date, and one references the duplicated asset name. Some unmatched-person rows also lack dates. |
| `work_orders.csv` | 99 | Add direct asset links and preserve original creators without creating login accounts. Do not invent issues just to link orders to assets. |
| `work_order_line_items.csv` | 255 | Add structured detail support. Four rows have no work-order number. |
| `work_order_sub_line_items.csv` | 40 | Add structured detail support. Fourteen rows have no work-order number. |
| `service_entries.csv` | 208 | Preserve original performers without misattributing work to the importing administrator. Reconcile 97 entries associated with exported work orders to avoid duplicate costs. |
| `parts.csv` | 6 | Five unique parts across location rows. Preserve per-location quantities and keep unknown stock/cost values distinct from zero. |

Additionally:

- 47 voided meter readings were excluded from active readings, with originals preserved.
- Six identical vendor rows were deduplicated by Fleetio ID. Distinct vendor IDs sharing a company name were not merged.
- Eleven contact rows describe jobs, not people. Their labels are available as location-history snapshots where referenced; no project records were fabricated. Jobs are not yet linked to structured project records.
- The existing administrator was matched without creating a duplicate general contact or changing permissions.
- Fuel entries and purchase orders are header-only files with no records.
- Four asset purchase-vendor links remain unset because the source name matches two distinct United Rentals vendor identities. Original vendor names remain in asset notes.

## Mapping decisions and limitations

- Source asset names become Equipment IDs and names. Fleetio types become categories, with explicit vehicle/equipment mappings. Duplicate identities are held.
- Sold/archived assets are retained as retired history. Stolen assets map to lost/damaged. Original status and archive information are retained in notes. Active source status maps to available; assignment alone does not prove operational use.
- Purchase dates are date-only UTC dates. Pacific timestamps are converted to UTC using daylight-saving rules. Assignment timestamps retain their explicit offsets. Meter dates have no time in the export; they are stored at Pacific midnight and labeled accordingly, not given invented observation times.
- Meter units remain miles or hours. Historical context is left unrecorded when the meter export does not supply it; current assignment is not projected backward.
- Fleetio issue priority `Critical` maps to urgent. `No Priority` uses the app's medium default because the current enum lacks an unset state; the original priority remains in the description.
- Historical location labels can be retained without a project foreign key. Initial current context is populated only on newly inserted, non-retired/non-stolen assets with supported open assignments. Existing current context is never changed.
- Assignment records identify the administrator as the importing creator; their notes explicitly say the original assignment actor was not provided. This is not evidence that the administrator performed the historical transfer.
- Rental rates retain hourly/daily/monthly values as fields. Weekly rates and source descriptions remain in rental notes because the current model lacks a weekly field.
- Additional asset, vendor, and issue fields remain in historical source notes. Contact birthdays, licensing, device information, and access rights were not copied into public-facing general contact fields. Originals are preserved in the restricted import archive.

## Implementation and safeguards

Entry point: `scripts/import-fleetio.cjs`; deterministic mapping: `scripts/imports/fleetio-plan.cjs`.

```sh
# Read-only preview; prints a plan digest and a private report directory.
node scripts/import-fleetio.cjs

# Only after reviewing a fresh preview and receiving write authorization:
node scripts/import-fleetio.cjs --apply --expect-plan <digest>

# Local tests (the actual-source regression skips when private CSVs are absent).
node --test scripts/imports/fleetio-plan.test.cjs
```

The importer guards the remote endpoint, company ID, company name, account email, active state, and admin role. It uses company-scoped source IDs, strict CSV parsing, explicit date/unit/status mappings, a read-only preview, schema preflight, a reviewed plan digest, and a serializable insert-only transaction. No update/delete/upsert-overwrite statements are issued. Every source row receives a disposition.

Before committing, the importer verifies all inserted values, reconciles table counts, checks existing scoped rows for changes, and confirms that replanning would insert nothing. A separate read-only transaction verifies persisted records after commit. Seventeen tests pass, including a run with a different process timezone.

The first attempted transaction rolled back on an unsupported yard `updatedAt` column. The mapping was corrected and schema preflight was added before the successful transaction. No records from that failed attempt were committed.

## Private recovery/audit material

Successful batch directory: `.import-reports/apply-vod0Hw/` (git-ignored; directory permission 0700, files 0600).

- `sources/`: unchanged copies of the supplied CSVs.
- `plan.json`: file fingerprints, planned rows, per-source dispositions and warnings.
- `before.json`: scoped pre-import snapshot, excluding authentication secrets.
- `verified-before-commit.json`: exact inserted IDs and verified counts.
- `committed.json` and `verified-after-commit.json`: commit and verification receipts.

Committed plan digest: `98b08c81f9bbb682e1ea56e8aa85fd9160736efa4a6bfd5a056a35ae2ecae70a`.

Do not commit or publish the private archive, snapshots, or client CSVs. The snapshot is an import audit aid, not a full database backup. Any future rollback must be separately authorized and checked against subsequent edits and dependencies; never delete records by company-wide scope or an ID prefix.

## Follow-up batch: tools and approved Equipment IDs

Source: `fleetio-tool-export-2026-09-23.csv`, supplied by the user from Downloads, plus Brian's inline response. The original file was not modified. It contains 249 tools; 244 were imported and five were held for operational-status clarification.

The follow-up committed 419 database rows:

| Record | Added |
| --- | ---: |
| Tool assets | 244 |
| Previously held vehicle/equipment assets | 2 |
| Rental-rate snapshots | 148 |
| Previously held meter readings | 5 |
| Previously held issues | 20 |

All existing scoped rows were verified unchanged, including the first batch. The 32 held historical assignments remain held. No users, contact merges, role changes, invitations, or synthetic assignment dates were introduced. Twenty-two tests passed, including original-data regression, the actual tools file, timezone handling, source-ID isolation, duplicate-asset matching, and no-op reruns. No schema migration or app deployment was needed.

### BL1 resolution

Brian supplied the two permitted names without specifying a machine-to-name mapping. The import retains the 2008 JLG as `BL1 - Sold` and assigns the suffix to the 1999 Snorkel. This mapping was announced before applying.

| Fleetio ID | Source equipment | Imported Equipment ID |
| --- | --- | --- |
| 2250825 | 2008 JLG 600AJ, serial 030012964 | BL1 - Sold |
| 2360956 | 1999 Snorkel, no serial supplied | BL1.1 - Sold |

Four readings identify the JLG by serial; the fifth identifies the Snorkel by year/make. The remaining name-only BL1 assignment is still ambiguous and held. Original source names remain in notes and archived CSVs.

### Tools still held

These five status cells contain descriptions/locations instead of a clear operational status. Confirm each as available, in use, under maintenance, retired, or lost/damaged before importing it.

| Tool | Fleetio status text |
| --- | --- |
| DZATT3 | SAFE for Trimble Eqpt |
| DZATT2 | Trimble 3D Equipment in House |
| DZATT1 | Trimble 3D Equipment on Dozer |
| EXATT30 | Hoe Pack for 420E or Mini (750lb) (Old EQ ID HP9) |
| EXATT29 | Hoe Pack for Komatsu PC228 (975lb) (Old EQ ID HP8) |

Of the original 23 held issues, three remain held:

- `FARM TO DO LIST - BD`, issue source ID 9046746: no exact asset in the tools export. Do not silently map it to the differently named vehicle `FARM TO DO LIST - BD 2`.
- `DZATT1`, issue source ID 4743478: its tool is held for status clarification.
- `VP4`, issue source ID 4743358: the issue lists serial `861834122927`, while the tools export contains `8.61834E+11`. The shortened value cannot establish an exact serial match; confirm the identity/full serial before linking.

Eleven tool rows contain scientific-notation serials: AC2, EXATT29, JJ9, JJ5, JJ4, JJ3, JJ2, JJ1, LM2, VP4, VP1. Ten of those tools were imported with the literal source text preserved and flagged; EXATT29 is already held for status. Do not expand shortened values into invented serial digits. Request full-text serials from the original system.

Two additional purchase-vendor links (FLATT2 and VP5) remain unset because United Rentals has two distinct source vendor identities. Purchase vendor names remain in notes, just like the four first-batch exceptions.

### Contact clarification for Brian

This is ambiguity in the Fleetio export, not duplicate accounts created by the import:

- **Bill Swartz:** Fleetio ID 1294864 uses `wswartz@alliedconstruction.net`, is dormant, and records 34 logins. ID 2185106 uses `bswartz@alliedconstruction.net`, is an unused invitation, and records zero logins. Ask which email is current. Do not infer that the newer invitation supersedes the older account.
- **Kim Newsome:** Fleetio ID 2299964 is the active user at `KNewsome@alliedconstruction.net`. ID 2711645 is a separate no-access, email-less contact with a tool assignment. The intended person is clear; retain one identity and preserve both source references when consolidation is implemented. Do not copy Fleetio administrator privileges or create a login automatically.
- Their four source rows and the generic Guest User row remain held. No contact records were merged or added in this batch.

### Additional mapping notes

- Tools use a separate source-ID namespace (`tool:<Fleetio ID>`) so a tool and a vehicle can share a numeric source ID without colliding.
- Source Type is retained as category; all records in the tools export use the app's TOOL asset type.
- In-Service/Available map to AVAILABLE. Out-of-Service maps to UNDER_MAINTENANCE; original labels remain visible in status notes.
- The export lacks creation/update timestamps. These app timestamps use the recorded batch receipt time, explicitly identified as import metadata rather than historical acquisition or assignment time.
- Source purchase and warranty dates remain date-only. Unknown meter units/dates and historical assignment dates are not invented.
- Current person/location snapshots are populated only where the source label maps safely to an existing user or recognized location. Unmatched names remain in notes; no historical assignment period is manufactured.
- Original Fleetio QR URLs are preserved only in the private source archive, not republished as app sharing links.

### Follow-up audit and rerun

Successful receipt directory: `.import-reports/apply-PVjvkb/`. It contains the original CSV archive (including `tools.csv`), pre-import snapshot, full row dispositions, and commit/verification receipts, under the same private permissions as batch one.

Committed digest: `11619cf802b3705a712f639556210336d2292ecb74ee158d9ea9736b6b8df186`.

```sh
node scripts/import-fleetio.cjs --client-followup --tools /path/to/fleetio-tool-export-2026-09-23.csv
FLEETIO_TOOL_EXPORT=/path/to/fleetio-tool-export-2026-09-23.csv node --test scripts/imports/fleetio-plan.test.cjs
```

The first command is read-only. A future write still requires a fresh reviewed digest and explicit `--apply --expect-plan <digest>`. The approved identifiers and recorded receipt timestamp are in `scripts/imports/allied-followup-2026-09-23.cjs`.

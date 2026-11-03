# Temporary asset import reviews

The client review at `/import-review/<token>` collects corrections for held import rows. It does not write to assets, assignments, contacts, inventory, or work orders. A submitted review is a reconciliation input, not an applied import.

## Client workflow

- View the original data and the reason each row was held.
- Correct typed fields, exclude a row with a reason, or leave a question.
- Enter a reviewer name and save each response. Saves persist across visits.
- Submit after every row has a decision. Questions remain explicitly unresolved in the export.
- Submitted answers become read-only until an administrator reopens the review.

Dates entered in the form are Pacific wall times (`America/Los_Angeles`). The validator rejects invalid calendar dates, reversed assignment intervals, and ambiguous or nonexistent daylight-saving times. Final import processing must convert these wall times using `pacificDate`, not the operator's computer timezone.

## Access and storage

Links contain 32 random bytes encoded as hexadecimal. Only their SHA-256 hashes are stored in the database. They expire after 14 days. The public response includes curated source context and company-scoped matching choices; the original source records and audit events are available only to company administrators.

Public requests use no-store caching, no-referrer policy, and noindex headers. JSON writes require the serving origin, have a 32 KiB body limit, and validate all fields and matching choices. A batch lock serializes saves, submission, reopening, and link changes. Per-row revisions reject concurrent overwrites. Each save retains its prior values and the submitted reviewer name in an audit event. A reviewer name is self-reported, not an authenticated identity.

## Admin workflow

Admins open **Assets → Import reviews** (`/dashboard/assets/import-reviews`). They can inspect saved answers, export source records and answers as JSON, reopen a submission, revoke access, or issue a replacement 14-day link. Replacing a link immediately invalidates the previous one and preserves answers. The replacement is shown once for copying. No email is sent automatically.

Finalization remains an operator workflow: resolve outstanding questions, recheck live records for duplicates or changes since the export, reconcile assignment closures and costs, then apply a guarded import. Do not treat `decision: resolve` as permission to blindly overwrite a current record. `exclude` rows must stay excluded.

## Create the Allied review

Apply migration `20261102180000_asset_import_review` and deploy the application before sharing a link. The delivery-specific creator reads the verified November import report and its archived CSV sources. It verifies source fingerprints, company identity, and the exact 67-row count. Its defaults only preview; `--apply` creates the review tables' records, never operational records.

```sh
npx tsx scripts/create-asset-import-review.ts \
  --report-dir /absolute/path/to/verified/import/report \
  --company-id COMPANY_ID \
  --origin https://buildfloapp.com
```

Supply the intended database connection through the environment. Run the same command with `--apply` after checking its preview. The unique link is saved to `client-review-link.json` inside the private report directory with owner-only file permissions. The company/source digest prevents duplicate workspaces. If a workspace already exists, renew its link from the admin page rather than creating another copy.

Do not commit CSVs, customer records, source snapshots, generated links, or private `.import-reports` files.

## Verification

- `tests/import-review.integration.test.ts`: requires an explicit disposable local `TEST_DATABASE_URL`; exercises access isolation, expiration, revocation, origin checking, validation, concurrency, submission, and admin controls.
- `e2e/import-review.spec.ts`: requires a disposable local `REVIEW_TEST_DATABASE_URL` and an app using that database. The 67-row visual cases additionally need a local-only seeded copy of the verified report at `.import-reports/review-ui-fixture`.
- The migration SQL can be tested against an isolated schema without changing operational data.

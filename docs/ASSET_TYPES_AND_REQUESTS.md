# Asset requests and company asset types

The asset request screen loads `/api/asset-requests` once per page instead of downloading all assets and fetching their requests sequentially. Filtering, totals, and stable pagination run in PostgreSQL, scoped to the signed-in user's company. Each page contains at most 25 requests. The pending count covers the company, independent of the selected status. Failed loads show a retry action; the browser request times out after 20 seconds. Approval, rejection, and return errors are visible, and the pagination has room below it for the chat launcher.

Company administrators manage types in **Settings → Assets → Types**. Vehicle, Equipment, Tool, and Technology are available by default, including for newly created companies. Administrators can add types, rename labels, archive options, and restore them. Staff can read the options but cannot change them. Names are unique within a company, ignoring case; stable internal keys retain existing asset assignments when labels change.

Archived types remain visible on existing assets and in filters. Existing assignments can be retained when editing other fields; creating or switching to an archived type is rejected. New and edit forms, category lookup, asset lists and filters, asset detail displays, and the request list use the company-managed types. Audit entries record changes.

## Deployment

Deploy the matching application build and apply `20261105120000_configurable_asset_types` using `npx prisma migrate deploy`. This converts `Asset.type` from its fixed enum to text without changing stored values, creates and seeds the company type definitions, and adds a request-list index. It does not recategorize existing assets. No seed command or manual SQL is needed in production.

The migration was exercised against a disposable local PostgreSQL database. Production deployment and migration execution are separate release steps.

## Verification

Three integration scenarios cover type permissions, company isolation, defaults, custom types, renaming, archiving/restoration, asset editing/filtering, request pagination, and approval. Nine existing asset pagination integration tests and the route audit coverage check pass. Eight existing pagination browser tests and five request/type browser scenarios pass, including a recoverable load failure and desktop/mobile layouts. TypeScript, Prisma schema validation, and the UI detector pass. The exact migration SQL also passed a rollback-only migration fixture that verified preservation of all three original enum values and the four seeded default options.

# Asset requests and company asset types

The asset request screen loads `/api/asset-requests` once per page instead of downloading all assets and fetching their requests sequentially. Filtering, totals, and stable pagination run in PostgreSQL, scoped to the signed-in user's company. Each page contains at most 25 requests. The pending count covers the company, independent of the selected status. Failed loads show a retry action; the browser request times out after 20 seconds. Approval, rejection, and return errors are visible, and the pagination has room below it for the chat launcher.

The request list follows the Assets grid: compact bordered columns, alternating rows, separate equipment IDs, inline status filtering and pending counts, and a range-based pagination footer in one panel. The table scrolls horizontally on small screens, and loading/error states retain the surrounding layout.

Company administrators manage types in **Settings → Assets → Types**. Vehicle, Equipment, Tool, and Technology are available by default, including for newly created companies. Administrators can add types, rename labels, archive options, and restore them. Staff can read the options but cannot change them. Names are unique within a company, ignoring case; stable internal keys retain existing asset assignments when labels change.

Archived types remain visible on existing assets and in filters. Existing assignments can be retained when editing other fields; creating or switching to an archived type is rejected. New and edit forms, category lookup, asset lists and filters, asset detail displays, and the request list use the company-managed types. Audit entries record changes.

## Deployment

Deploy the matching application build and apply `20261105120000_configurable_asset_types` using `npx prisma migrate deploy`. This converts `Asset.type` from its fixed enum to text without changing stored values, creates and seeds the company type definitions, and adds a request-list index. It does not recategorize existing assets. No seed command or manual SQL is needed in production.

The migration was exercised against a disposable local PostgreSQL database. Production deployment and migration execution are separate release steps.

## Verification

Three integration scenarios cover type permissions, company isolation, defaults, custom types, renaming, archiving/restoration, asset editing/filtering, request pagination, and approval. Nine existing asset pagination integration tests and the route audit coverage check pass. Eight existing pagination browser tests and five request/type browser scenarios pass, including a recoverable load failure and desktop/mobile layouts. TypeScript, Prisma schema validation, and the UI detector pass. The exact migration SQL also passed a rollback-only migration fixture that verified preservation of all three original enum values and the four seeded default options.

## Creating requests and recovering failed asset loads

The main Asset Requests page has a **New Request** action. It opens a searchable, server-paginated list of available assets (25 per page). Choosing one opens its existing request form automatically. Successful submissions refresh the request list cache and show confirmation. The dialog supports native focus containment and Escape; date fields use local calendar dates and stack on narrow screens. Unavailable assets are still rejected by the existing server route.

Asset list/category reads have a 20-second timeout and preserve server errors. A 401 shows **Sign in again**, clears the stale local identity and query cache, and preserves the current page as the login return destination. These reads wait for the user identity, and list/category query caches are scoped by user. This improves recovery without changing server authorization rules or assuming every failed load is an authentication failure.

The **Import reviews** link was removed from the Assets heading. Existing review routes remain available by direct URL.

Validation: the ten asset-list browser scenarios and five existing request/type browser scenarios passed. The new request-entry scenario also passed after allowing for cold development compilation, including actual database persistence of the pending request and selected dates. Desktop/mobile picker and form captures were reviewed. TypeScript passed. No new database migration is required for these UI changes.

For invitation-delay investigations, compare invitation creation with the provider's email creation timestamp. Provider acceptance and its latest event do not establish the exact time a message appeared in the recipient's inbox; that requires provider delivery history or recipient mail-system logs. No invitation emails are sent by the UI verification tests.

## Consistent request workflow and Overview widget

The New Request asset picker now matches the main Assets grid: equipment ID, asset name/serial, make/model, type, category, status, location, assignment and cost. It supports server-side type/category filters, search, column sorting and 25/50/100-row pages. Only available assets are eligible; its Request action remains visible while scrolling horizontally on mobile.

Choosing an asset opens the shared compact `AssetRequestDialog` in place. The same form is used from asset details and the Overview Requests widget. Submission refreshes the request list and asset summary. Closing restores focus, errors preserve the entered form, and controls cannot dismiss a submission while it is in progress.

The asset Overview widget displays full total/pending counts, with View requests and New Request actions. Counts are computed independently from the limited recent-request preview. The asset-specific Requests tab now uses the server-paginated `/api/asset-requests?assetId=...` endpoint, retaining company isolation and avoiding the former ten-row limit. Unavailable assets explain why a new request cannot be made.

Shared typography and density live in `src/app/workspace.css`; see `docs/WORKSPACE_UI.md`. No schema migration is required.

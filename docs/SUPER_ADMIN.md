# Platform administration

Implementation branch: `feature/super-admin-dashboard`. This work is for local review; main and production must not be updated until the application owner authorizes release.

## Navigation and scope

The entry is **Settings → Platform administration**, available only to explicit platform administrators. `/dashboard/platform` contains Overview, Companies, Feedback, and Audit. Each company has Overview, Users & invitations, Activity, Feedback, AI assistant, and Settings tabs. Normal company navigation remains unchanged.

Platform access is a `PlatformAdmin` record. It is independent of `User.role` and the pre-existing `FeedbackManager` grant. A company administrator or feedback manager does not automatically become a platform administrator. No HTTP endpoint can grant platform access. The existing feedback-only permission continues to work independently; a verified platform administrator can also manage feedback across companies.

## Interface extension and evidence

This is an operational extension of the existing dashboard, not a new visual identity. It keeps the Settings entry point, inherited dashboard typography, the existing primary-blue controls, neutral text and borders, white surfaces, and semantic status colors. Overview uses a compact metric strip with linked attention queues. Company and activity records retain readable labels and wrap or stack at narrow widths; filters expand progressively. Native confirmation dialogs require a reason, and role changes identify the user's full name, email, and current → proposed role. The security gate separates ordinary sign-in from platform verification. Company feedback names its scope, and audit module options cover the route inventory and explicit platform operations.

Source comparison checked `tailwind.config.ts`, `src/app/globals.css`, the existing Settings page, `src/components/feedback/shared.tsx` and `board.tsx`, all `src/components/platform/` components, and `src/lib/platform/modules.ts`. Platform controls directly reuse the feedback button, field, and error styles. This documentation records the extension without creating or rewriting `DESIGN.md`, `PRODUCT.md`, design sidecars, or system tokens. No authoritative product/design document is present in this isolated worktree.

Pre-existing design drift remains: global CSS declares a copper/steel palette and its own radius tokens, while existing feedback controls and the platform extension use the Tailwind primary-blue palette and utility radii. This task preserves that incumbent behavior; reconciling those sources is outside this extension. Rendered review artifacts live under `.impeccable/review/super-admin/`; source comparison does not replace the separate finish review or browser validation.

## Security and company lifecycle

- The platform console requires both an active normal login and a separate, short-lived MFA session. Enrollment requires the current password and a valid authenticator code. Six-digit SHA-1 TOTP follows [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238.html); tests check its published vectors, replay prevention, and authenticated encryption.
- TOTP secrets use AES-256-GCM with a separate `PLATFORM_MFA_ENCRYPTION_KEY` (64 hexadecimal characters). Keep this key persistent and secret. There is no default or JWT-secret fallback. Rotating it requires a deliberate re-enrollment/recovery procedure.
- Platform session tokens are random, hashed in the database, and stored in a Secure (on HTTPS), HttpOnly, SameSite=Strict cookie. Sessions expire after two hours. Every privileged request rechecks the grant, active account/company, session expiry, and session versions. The console rechecks access every 30 seconds and on window focus.
- Five unsuccessful MFA/password attempts lock platform verification for 15 minutes. A successful TOTP counter cannot be reused. Enrollment secrets expire after 10 minutes.
- Suspension preserves data and increments company accessVersion. Staff/vendor tokens cease working immediately on their next request. Client portals, shared asset/task links, import-review links, invitation access, static uploads for staff sessions, and scheduled company notifications are blocked. Reactivation does not revive old staff/vendor tokens; public links may work again if still valid.
- A company containing a platform administrator cannot be suspended through the console. Company user-management controls cannot edit, reset, disable, delete, or reactivate platform administrators. The platform console also protects the last active company administrator.
- User access/role changes and password resets increment the user's sessionVersion. Company-wide session revocation increments accessVersion. Older tokens with no version fields are treated as version zero, preserving existing sessions until they are revoked.
- No impersonation, permanent company deletion, cross-company user transfer, or public company registration was added.

## Company operations

Company creation atomically creates the account, its initial ADMIN invitation, and an audit record. Existing accounts and unexpired email reservations are checked before creation. No password is generated or sent. The operator can copy the invitation link; the company Users & invitations tab supports new invitations, link renewal/resend, and revocation of pending duplicates. Explicit email sends use the platform administrator's company's configured email service. Failed email delivery leaves the invitation available for manual delivery and appears in the audit feed.

The **AI assistant** company tab (`/dashboard/platform?company=<id>&tab=ai`) lets verified platform administrators choose an OpenRouter model, edit and test an unsaved company system prompt, set the daily request limit, and enable or disable company data chat. Company administrators use the **Company data** tab in the bottom-right chat for their own company; they cannot edit these platform settings. Feedback grants remain independent. See [Company data assistant](DATA_ASSISTANT.md) for data scope, credentials, limits, migration, and verification.

Company details, user roles/activation, company suspension/reactivation, and session revocation require an audit reason. Sensitive controls explain their effect and ask for confirmation inside the app. Platform grants and MFA recovery remain offline operator actions.

## Activity coverage and fidelity

`docs/platform-route-coverage.json` inventories the existing API handlers. A regression test fails if an existing API handler bypasses the shared authorization/audit wrapper or is missing from this manifest. New platform handlers use their own MFA guard and transactionally record their administrative changes.

- Every authenticated API mutation has a server-generated STARTED event before execution and an immutable SUCCEEDED or FAILED event afterward. File/report/export access through API routes is recorded. Successful sign-ins are recorded even when the company has no project. Scheduled jobs are identified as SYSTEM and produce per-company summaries.
- The audit boundary validates live user/vendor state even for legacy routes which still decode JWT claims themselves. Public link identities are resolved from stored links, never a client-supplied company id. Cross-site browser mutations are rejected.
- Events contain company and actor snapshots, operation/module, resource id when available, time, outcome, and safe before/after fields for supported records. Asset/task/work-order changes include relevant parent state; nested operations identify their route and resource. This is business-operation history, not a recording of every click, image view, or field typed.
- An allowlist keeps passwords, credentials, tokens, headers, arbitrary request/response bodies, document contents, and free-form metadata out of automatic snapshots. Request query strings and share tokens are never logged. Administrative reasons are intentional user-entered audit content.
- Audit events have no cascading foreign keys. Database triggers reject UPDATE and DELETE, so removing business records does not remove their audit history. No audit deletion endpoint or retention purge is provided.
- If the process stops after STARTED, the incomplete operation is visible in the attention queue after five minutes. A failed outcome can represent a partial business operation or failed completion logging; verify the record before retrying. Existing business writes and generic audit completion are not one transaction. Platform administrative mutations and their audit record are transactional.
- Legacy project activity is separately selectable and clearly labeled. Its original coverage and attribution limitations are preserved. Deleted or unrecorded historical events are not invented. Direct SQL/offline scripts outside these application APIs are outside the automatic request audit boundary; administrative scripts in this feature explicitly record their actions.
- Activity filters include company, actor name, module, outcome, dates, and text. Lists are server-paginated, with indexed company/time, scope/time, actor/time, module/time, and outcome/time paths. Date filters use UTC and displayed timestamps use the viewer's local timezone.
- Filtered CSV export includes at most 10,000 events. Larger exports require narrower filters rather than silently truncating. Spreadsheet formulas are escaped. Exports themselves are audited. Legacy history is available for reading, not mixed into the audited export.

## Overview and attention queues

Overview shows company counts, active/suspended accounts, users signed in over seven days, companies created over 30 days, and open feedback. Queues link to companies without administrators, expired invitations, unanswered feedback older than seven days, failed operations, incomplete audit attempts, and companies with no sign-in for 30 days. These are in-app queues; external automated alerts and billing are outside this release.

## Release preparation (not executed against production)

1. Review and merge only after the owner's explicit approval. Apply `20261104120000_platform_administration` before serving the new application. It adds fields/tables/indexes and audit immutability triggers; it grants no account access and changes no existing company state. The local migration was exercised against a disposable database copied from the pre-change schema. Validate migration history separately for the release environment.
2. Configure `PLATFORM_MFA_ENCRYPTION_KEY` using a securely generated 32-byte hex key. Preserve it across deployments and store it with deployment secrets.
3. Only after explicit release approval, with `DATABASE_URL` explicitly targeting the intended environment, run `npx tsx scripts/platform-admin.ts --action grant --email olumide.southpaw@gmail.com --reason "Owner-approved platform access"` for the designated owner. The script requires an existing active account in an active company; it does not create an account or bypass those checks. Do not infer grants from company roles or existing feedback grants. No production grant has been made as part of this implementation.
4. Sign in as the owner, open Settings → Platform administration, and complete authenticator enrollment. Confirm another company's activity, account controls, and feedback; confirm a normal company admin is denied.
5. For verified offline recovery, use the same script with `--action reset-mfa` and a reason. It clears enrollment and revokes platform sessions; it does not reset the account password. `--action revoke` removes a grant, revokes sessions, and refuses to remove the last platform administrator.

## Validation

`tests/platform.integration.test.ts` requires an explicit local `TEST_DATABASE_URL`; it exercises permissions, MFA, company onboarding, suspension/revocation, portal boundaries, user protections, immutable/redacted activity, export/pagination, and route coverage. `e2e/platform-admin.spec.ts` requires `PLATFORM_TEST_DATABASE_URL` matching a local running app. The browser test app uses `JWT_SECRET=local-verification-only` and the test-only MFA key `17` repeated 32 times. Never use these test credentials in production.

Desktop/mobile screenshots are local review artifacts under `.impeccable/review/super-admin/`. No production data or messages are created by these tests.

Before the company data assistant extension, local verification completed on the feature branch: 11 platform integration tests, 10 existing feedback integration tests, 19 browser workflow/regression tests, and two desktop/mobile smoke tests against the production standalone build passed. `npx tsc --noEmit`, `npm run build`, and whitespace checks passed. The UI finish review is recorded separately in the local review artifacts; these checks do not deploy or grant production access.

## Company deletion

Open **Companies → company → Settings → Delete company**. A verified platform administrator must type the exact current company name and provide a reason. The operation permanently removes the account, users, invitations and owned business records. It invalidates access by removing the underlying identities; deleted emails can be used for a new account. Companies containing any platform administrator, including the acting administrator, are protected.

`DELETE /api/platform/companies/[id]` accepts `{ confirmationName, reason }`. It enforces the existing MFA/session and same-origin guards, locks the company and its users, removes dependent records in foreign-key order, and records the deletion audit event in the same transaction. Any dependency failure rolls everything back and returns a recoverable conflict. No new migration is needed. Legacy subcontractor access lists lose only the deleted company's project IDs.

Audit history remains immutable and searchable in the platform Audit view. Backups and separately stored uploaded files are retained; this feature removes application accounts and database records, not a physical-storage or backup purge. No real companies are deleted during implementation or tests.

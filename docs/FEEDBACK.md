# In-app feedback

Signed-in dashboard users open the feedback button at the bottom right. Each new subject and message creates one request in **To do**, with a private conversation. The widget lists the submitter's requests and their current status. Users can add details and return to read replies. Sending text is explicit; Enter adds a new line in the reply composer.

Authorized feedback managers open **Settings → Feedback** (`/dashboard/settings?tab=feedback`). The former `/dashboard/feedback` URL redirects there. Verified platform administrators can also open the board from **Settings → Platform administration → Feedback**, or a company's Feedback tab. The board has **To do**, **In progress**, and **Done** lanes. Cards move between lanes using pointer or keyboard drag-and-drop, or the status menu. Opening a card shows the conversation and allows a reply. Every status change records the actor and transition in the conversation. Cards are ordered newest first; dragging within a lane does not reorder them.

## Access

- Company users, including company admins, see their own requests and conversations. They can add comments and read replies, but cannot change status or open the management board.
- Authorized feedback managers see requests from every company, reply, and update status. Company names appear on their board cards. Platform company filters narrow the displayed requests, and the board names the selected company; the unfiltered board says **All companies**.
- An explicit `FeedbackManager` record independently grants feedback management. This existing permission does not require platform MFA and does not grant platform administration. Company roles, including `ADMIN`, never grant feedback management. There is no public endpoint to grant this permission; grant it only to a verified account authorized by the application owner.
- An explicit `PlatformAdmin` record with a valid, MFA-verified platform session also grants feedback management. A platform grant alone is insufficient. Platform session expiry or revocation removes this route to feedback management on the next request; an independent `FeedbackManager` grant continues to apply. Removing either grant does not remove the other. See [Platform administration](SUPER_ADMIN.md) for enrollment, grant, and recovery procedures.
- Company team-management routes protect other accounts holding either a `FeedbackManager` or `PlatformAdmin` grant from reset, edit, removal, or reactivation.
- Membership and active state are verified server-side on every API call. UI state and JWT role claims do not grant access by themselves.
- Deleted users' conversations retain their author-name snapshots. Company deletion removes its feedback.

## Behavior and limits

Requests and replies are stored in PostgreSQL. The board and open request list refresh every 30 seconds; open conversations refresh every 15 seconds and on window focus. This is asynchronous feedback, not an AI chatbot or a staffed live-chat promise. No email, SMS, attachments, or external integration is included.

List endpoints return 25 requests at a time, and conversation endpoints return 50 messages at a time with an older-message cursor. Search matches subjects and submitter names. The first message records only the dashboard pathname, without query parameters or URL fragments. Subjects are limited to 160 characters and messages to 4,000 characters. Writes require same-origin JSON and are capped at 24 KiB. Responses are private and uncached.

Client-generated identifiers make retries idempotent. Per-request locks serialize replies and status changes; status versions reject concurrent overwrites. Failed sends retain text. Unsent drafts survive closing/reopening the panel during the current app session; new-request drafts are not saved after a full page reload.

## Deployment and verification

Deploy migration `20261103190000_feedback_conversations` with the application. It only adds feedback tables, indexes, and a status enum. It creates no feedback-manager grants or customer messages.

The platform administration extension additionally requires migration `20261104120000_platform_administration` before its application code runs, including the updated feedback authorization check. This local implementation does not apply production migrations or create production grants.

`tests/feedback.integration.test.ts` requires a disposable local `TEST_DATABASE_URL`. `e2e/feedback.spec.ts` requires a running local app and a matching `FEEDBACK_TEST_DATABASE_URL`; its JWT secret is `local-verification-only`. Tests cover automatic card creation, access boundaries, retries, validation, pagination, replies, status conflicts, keyboard drag, draft recovery, and desktop/mobile layouts.

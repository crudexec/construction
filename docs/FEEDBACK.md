# In-app feedback

Signed-in dashboard users open the feedback button at the bottom right. Each new subject and message creates one request in **To do**, with a private conversation. The widget lists the submitter's requests and their current status. Users can add details and return to read replies. Sending text is explicit; Enter adds a new line in the reply composer.

Platform super admins open **Settings → Feedback** (`/dashboard/settings?tab=feedback`). The former `/dashboard/feedback` URL redirects there. The board has **To do**, **In progress**, and **Done** lanes. Cards move between lanes using pointer or keyboard drag-and-drop, or the status menu. Opening a card shows the conversation and allows a reply. Every status change records the actor and transition in the conversation. Cards are ordered newest first; dragging within a lane does not reorder them.

## Access

- Company users, including company admins, see their own requests and conversations. They can add comments and read replies, but cannot change status or open the management board.
- Platform super admins see requests from every company, reply, and update status. Company names appear on their board cards.
- Explicit `FeedbackManager` records grant this platform super admin permission for feedback. Company roles, including `ADMIN`, never grant it. This permission applies to feedback; other application modules keep their existing company scope. There is no public endpoint to grant this permission. Grant it only to a verified account authorized by the application owner; removing the record revokes access on the next request.
- Company team-management routes cannot reset, edit, remove, or reactivate another platform super admin account.
- Membership and active state are verified server-side on every API call. UI state and JWT role claims do not grant access by themselves.
- Deleted users' conversations retain their author-name snapshots. Company deletion removes its feedback.

## Behavior and limits

Requests and replies are stored in PostgreSQL. The board and open request list refresh every 30 seconds; open conversations refresh every 15 seconds and on window focus. This is asynchronous feedback, not an AI chatbot or a staffed live-chat promise. No email, SMS, attachments, or external integration is included.

List endpoints return 25 requests at a time, and conversation endpoints return 50 messages at a time with an older-message cursor. Search matches subjects and submitter names. The first message records only the dashboard pathname, without query parameters or URL fragments. Subjects are limited to 160 characters and messages to 4,000 characters. Writes require same-origin JSON and are capped at 24 KiB. Responses are private and uncached.

Client-generated identifiers make retries idempotent. Per-request locks serialize replies and status changes; status versions reject concurrent overwrites. Failed sends retain text. Unsent drafts survive closing/reopening the panel during the current app session; new-request drafts are not saved after a full page reload.

## Deployment and verification

Deploy migration `20261103190000_feedback_conversations` with the application. It only adds feedback tables, indexes, and a status enum. It creates no feedback-manager grants or customer messages.

`tests/feedback.integration.test.ts` requires a disposable local `TEST_DATABASE_URL`. `e2e/feedback.spec.ts` requires a running local app and a matching `FEEDBACK_TEST_DATABASE_URL`; its JWT secret is `local-verification-only`. Tests cover automatic card creation, access boundaries, retries, validation, pagination, replies, status conflicts, keyboard drag, draft recovery, and desktop/mobile layouts.

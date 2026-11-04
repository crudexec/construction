# Company data assistant

Implemented on `feature/super-admin-dashboard`, layered on the platform console. No main push, deployment, production migration, real-provider inference, or production configuration is part of this change.

## Using it

Company ADMIN users open the existing bottom-right chat and select **Company data**. Feedback remains available in the same window, including for staff. Administrators can ask questions, follow up, open their saved conversations, and inspect the data queried for each answer. Conversations are private to the requesting administrator within their company. Existing feedback permissions do not grant data chat access.

MFA-verified platform administrators use **Settings → Platform administration → Companies → a company → AI assistant** to select an OpenRouter model, edit that company's system prompt, set its daily request limit, and enable or disable chat. The model catalog is loaded from OpenRouter and filtered for tool calling, tool-choice support, and at least 32K context. It includes open-source/open-weight and proprietary models; the operator chooses the intended model and can inspect its license and prices through the catalog link. No model or key is hard-coded for production.

**Run test** uses the form's current, possibly unsaved model and prompt against the selected company's real scoped records. It does not publish settings or create a customer conversation. Tests consume provider credits and count against the company's request limit. **Save company settings** publishes a new version, requires a reason, and detects conflicting saves from another window. Background refreshes preserve the unsaved configuration and test question. If another window saves a newer version, a notice offers **Reload saved settings**; saving against the old version is rejected. The separate test result is reset when its model, prompt, or question changes. Each new message uses the currently saved configuration; changed or disabled settings stop an in-flight company answer at its next access check.

## Interface extension and evidence

The assistant extends the incumbent feedback dialog and platform company settings. It uses the shared feedback `button`, `primary`, `control`, and error components through the existing platform exports, retaining primary-blue actions, neutral text and borders, white surfaces, utility radii, and native form controls. Configuration and draft testing share two columns at the existing `xl` breakpoint and stack below it. The existing constrained-height floating dialog contains a scrolling conversation and a bottom composer; source details expand in place. No new shipping raster assets or visual-system files were introduced.

Source comparison checked `tailwind.config.ts`, `src/app/globals.css`, `src/components/feedback/shared.tsx` and `widget.tsx`, `src/components/platform/shared.tsx`, `company.tsx` and `company-ai.tsx`, and `src/components/data-chat/`. Authorization, data projection, limits, storage, and configuration claims were compared with `src/lib/data-chat/`, the data-chat and platform AI route handlers, and migration `20261104200000_company_data_assistant`.

The required review captures are `.impeccable/review/data-assistant/settings-1440.png`, `settings-390.png`, `chat-1440.png`, and `chat-390.png`. The build handoff confirmed all four valid; the single detector run returned no findings (`[]`), and the finish reviewer returned **ship** for this contained extension. This records the supplied review outcome rather than a new visual review.

Pre-existing drift remains unchanged: root `PRODUCT.md`, `DESIGN.md`, and a design sidecar are absent, and global CSS declares copper/steel and radius tokens while the incumbent feedback/platform controls use Tailwind primary-blue and utility radii. The narrow extension preserves those sources; documentation does not create a new visual identity or reconcile unrelated system drift.

## Data and grounding

The model has one read-only structured tool, with eight allowlisted datasets:

| Dataset | Available fields / queries |
| --- | --- |
| Assets | Identity, equipment/category/status, make/model/year/serial, location and assignment IDs, purchase date/cost, custom status name |
| Projects | Title/number, status, priority, budget, dates and project location |
| Tasks | Title/status/priority, due/completion dates, project and assignee IDs |
| Work orders | Title/status, asset/assignee IDs, schedule/completion, estimated/actual cost |
| Vendors | Name/company, type/status, city and active state |
| Contacts | Name/company/position; contact details and comments are not sent |
| Inventory | Name/SKU, quantity/unit and unit cost |
| Imported service history | Asset/title, performed date, cost and work-order ID |

Search supports exact record ID, bounded text, valid status enums, creation dates, relevant asset/project IDs, and due-date filters where applicable. A summary returns the exact matching count and status breakdown. Search returns 20 records per page, at most 20 pages. Totals include retired and archived records unless filtered. No whole-database dump, document attachment ingestion, arbitrary SQL, arbitrary table/column selection, web access, or mutation tool is available. Financial aggregation beyond the bounded returned records is not provided; the prompt explicitly forbids presenting partial-page sums as company totals.

The server derives company scope from the authenticated administrator or verified platform test target. Tool arguments cannot override it. Explicit Prisma projections exclude passwords, keys, access/share tokens, raw source metadata, notes and document contents. Database strings are bounded and treated as untrusted content. A separate server-built source list includes filters, counts/status breakdowns and links to supported company records. Test sources avoid links into another company's normal dashboard. Answers render as plain text, not HTML or model-generated links. Tool use provides evidence, not a guarantee that the model's interpretation is correct.

## OpenRouter and credentials

Set **OPENROUTER_API_KEY** only in the application's server environment/secret manager. It is never sent to the browser, stored in a company configuration, committed, or put in a model message. The UI reports whether a key is configured without returning it. A missing key leaves chat and tests unavailable; disabled configuration drafts can still be saved.

The application uses OpenRouter's fixed HTTPS `/api/v1/models` and `/api/v1/chat/completions` endpoints. Tool round-trips use the [documented tool calling format](https://openrouter.ai/docs/guides/features/tool-calling). Requests require supported parameters and set `data_collection: deny` and `zdr: true` under [provider routing](https://openrouter.ai/docs/guides/routing/provider-selection). Provider availability depends on model and account policies; failure never relaxes those flags. OpenRouter's ZDR setting may include Safety Retention endpoints depending on account settings. Configure account-level privacy policy as required; the app does not promise that OpenRouter itself or every provider retains nothing.

Questions, the company prompt, up to four previous exchanges, and relevant query results are transmitted to OpenRouter and its selected model provider. The interface states this before sending. Prompts are guidance, not a security boundary; never use them as a place to store credentials. No real provider inference was performed during development without the owner's key.

## Storage, limits and audit

`CompanyAiConfig` stores current company settings and an optimistic version. `AiConversation` stores an administrator's thread; `AiRun` stores question, answer, safe source summaries, model/version, reported token usage and outcome. Run records for draft tests are stored for operational accounting but not exposed in company chat history. Company deletion cascades these records; user deletion cascades their conversations. There is no automated retention purge in this change. Platform audit history remains immutable and contains configuration metadata and run outcomes, not prompt/question/answer contents. Historical prompt bodies are not version-archived.

The default company limit is 100 attempted questions/tests per UTC day, configurable from 1–1,000. Reserved attempts, including provider failures, count. A database advisory lock serializes quota reservations, with 10 requests per company/user/minute and one concurrent request per company/user. Client message IDs make completed retries idempotent. Each conversation allows 30 attempted questions; model context uses only the last four successful exchanges. A response allows at most four provider calls, six data lookups, 1,800 output tokens per provider call, and a 55-second provider deadline. These are usage bounds, not a dollar-spend guarantee; set an appropriate OpenRouter key credit limit as well.

Authentication, role, company suspension/session version, platform MFA (for tests), and published configuration are rechecked before provider calls and data lookups and before returning success. A process interrupted after reservation leaves an observable run/STARTED audit; a subsequent company request marks stale RUNNING reservations failed after two minutes. Provider errors are sanitized. No automatic model or write fallback occurs.

## Local verification and rollout

1. Apply `20261104200000_company_data_assistant` after the earlier platform migration. It adds three tables and indexes, with no existing data conversion and no automatically enabled companies.
2. Configure the server key in the intended environment only after release approval.
3. Sign in to the platform console, select the desired company's model and prompt, run a live draft test, then enable and save the configuration.
4. Verify a company admin's grounded answer and a normal staff user's denied data access.

Integration tests use a disposable local `TEST_DATABASE_URL`: `npx tsx --test tests/data-chat.integration.test.ts`. They mock only the external provider transport and exercise the real database, handlers, authentication, scoped queries, history, quotas, prompt save/test and audit behavior.

Browser tests use `AI_TEST_DATABASE_URL` and an app launched against that same local database. The explicit `tests/fixtures/openrouter-preload.cjs` fixture replaces only the two fixed OpenRouter endpoints. Load it through `NODE_OPTIONS=--require <absolute-fixture-path>` with `BUILDFLO_AI_TEST_MODE=1`, `OPENROUTER_API_KEY=local-provider-fixture` and `JWT_SECRET=local-verification-only`. The fixture refuses a non-local database and is not imported by application code. Never use these test settings for production. Screenshots under `.impeccable/review/data-assistant/` contain demo data and fixture-generated responses.

Local verification reported for this extension: six new data-chat integration tests, 21 existing platform/feedback integration tests, five new data-chat browser tests, and six existing feedback browser tests passed. The browser coverage includes preservation of an unsaved settings draft across background refreshes; the existing administrator launcher test was updated for **Open chat** and rerun successfully. TypeScript checking passed. `npm run build` completed successfully after the documentation handoff.

A real public OpenRouter model-catalog smoke request returned HTTP 200 and eligible models. It required no customer data or inference. The owner's server API key has not been supplied; no real model inference or customer-data export occurred. Fixture tests establish application behavior, not real-provider answer quality or availability under the configured privacy policy.

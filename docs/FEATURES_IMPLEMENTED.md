# Features Implemented

**Started:** July 13, 2026

A running log of features delivered in this development cycle, written for sharing with the client. Each entry covers what was requested, what was built, and where to find it in the app. Entries are added as features are completed.

---

## 1. Contacts & Cost Code Directory

**Date:** July 13, 2026
**Status:** Implemented and verified

This section covers two new features: a standalone **Contacts** module and a **Cost Code Directory** for project cost tracking.

### 1a. Contacts

#### What was requested
- Ability to make notes on contacts.
- Ability to add a contact without requiring a company name.

#### What was built

Previously, contacts only existed nested inside a Vendor's profile, and every contact had to belong to a vendor. There was no way to browse contacts on their own, and no way to add a person you work with who isn't tied to a specific company.

Contacts is now its own section of the platform, available from the main navigation sidebar.

**Contact list**
- A dedicated **Contacts** page lists everyone in your contact book: name, company (if any), email, phone, and position.
- Searchable and sortable by any column.
- Click any row to open the full contact record.

**Adding a contact**
- Click **Add Contact** to open a simple form: First Name, Last Name, Email, Phone, Position.
- **Company Name is optional** — you can leave it blank for a contact with no company affiliation.
- You can also optionally **link the contact to an existing Vendor** in your system, if the person works for a vendor you already track. This is independent of the free-text Company Name field, so you have flexibility either way.

**Contact detail page**
- View and edit all contact information in one place.
- Delete a contact when it's no longer needed.
- If a contact is linked to a vendor, there's a quick link back to that vendor's profile.
- One-click "Send Email" and "Call" shortcuts when a contact has an email or phone number on file.

**Notes**
- Every contact has a **Notes** section — an internal, team-only comment thread.
- Add a note, edit it later, or delete it. Each note shows who wrote it and when, with an "(edited)" indicator if it's been changed.
- Notes are private to your team and not visible to any external contact.

#### Where to find it
- Sidebar → **Contacts**

### 1b. Cost Code Directory

#### What was requested
- Ability to import a cost code directory when setting up a project, so project cost items can be tagged with those cost codes.

#### What was built

Bill of Quantities (BOQ) line items on a project could previously only be classified with free-text category/sub-category fields — there was no standardized, reusable list of cost codes (e.g. CSI MasterFormat-style codes like `03 30 00 — Cast-in-Place Concrete`).

A **Cost Code Directory** has been added: a reusable list of cost codes for your company that can be imported from a spreadsheet and then used to tag cost items on any project.

**Importing a directory**
- Cost codes can be imported by uploading a **CSV or Excel (.xlsx) file**.
- Expected columns: `code` and `name` (required), plus optional `description` and `csiDivision`.
- Importing is **additive**: codes that already exist (matched by code) are updated in place; new codes are added. Nothing is deleted or overwritten wholesale, so you can re-import an updated spreadsheet at any time without losing existing data.
- After import, you get a summary showing how many codes were created, updated, or skipped, plus any warnings (e.g. a row that was missing a required column).
- The import tool is available in two places:
  - **Settings → Cost Codes** — the main place to manage your directory.
  - **Inside any project's BOQ tab** — an "Import Cost Codes" button, so you can bring in your directory right at the point you're building out a project's cost breakdown.

**Managing the directory (Settings → Cost Codes)**
- View all cost codes for your company: code, name, description, CSI division, and how many BOQ items currently use each code.
- Add a single cost code manually, or edit an existing one.
- Delete a cost code — the system blocks deletion if it's currently in use on any BOQ item, so you can't accidentally break existing project cost data. You'll need to reassign or remove those items first, or simply deactivate the code instead.

**Using cost codes on a project**
- When adding or editing a BOQ (Bill of Quantities) line item on a project, there's now an optional **Cost Code** dropdown, populated from your company's directory.
- This is additive to the existing free-text Category field — nothing about the current BOQ workflow changes if you don't use cost codes.
- BOQ items tagged with a cost code show a small code badge next to the item name, so it's visible at a glance while reviewing a project's cost breakdown.

**Reusable across all projects**
- The cost code directory belongs to your company, not to any single project — import it once and every project can draw from the same standardized list. There's no need to re-import for each new project.

#### Where to find it
- Sidebar → **Settings → Cost Codes** (manage & import)
- Any project → **BOQ tab** → **Import Cost Codes** button, and the Cost Code field on each BOQ line item

#### Summary

| Feature | Client Ask | Delivered |
|---|---|---|
| Contact Notes | Notes on contacts | Full internal note thread per contact (add/edit/delete, author + timestamp) |
| Contact without company | Add a contact with no company | Company Name and Vendor link are both optional and independent |
| Cost Code Import | Import a cost code directory when creating a project | CSV/Excel import, reusable company-wide directory, available from Settings and directly from a project's BOQ tab |
| Cost Code Association | Associate project items with cost codes | Optional Cost Code field on every BOQ line item, shown as a badge in the cost breakdown |

---

## 2. Vendor-to-Contract Navigation Within a Project

**Date:** July 13, 2026
**Status:** Implemented and verified

### What was requested
When selecting a vendor from within a project, navigation should go straight to that vendor's contract for that project, instead of the vendor's general profile.

### What was built

On a project's **Vendors** tab, clicking a vendor row now takes you directly to the contract tied to that vendor for the current project — no more landing on the vendor's general profile and having to hunt for the right contract.

Since a vendor can, in principle, have zero or more than one contract tied to the same project (e.g. before a contract has been drawn up, or when there's an original contract plus a separate change order contract), the system resolves this automatically:

- **Exactly one contract** for that vendor on this project → goes straight to that contract's page.
- **No contract yet** → goes to the vendor's normal profile page, same as before, since there's nothing to open yet.
- **More than one contract** → goes to the vendor's Contracts tab so you can pick the right one, rather than guessing.

This is entirely automatic — no change to how vendors are assigned to projects or how contracts are created.

---

## 3. Faster Vendor-to-Project Estimate Flow + Cost Codes & Spec Sections on Line Items

**Date:** July 13, 2026
**Status:** Implemented and verified

### What was requested
Adding a vendor to a project needed to be faster and cleaner: an "Add/Create Estimate" action that takes you straight to a trimmed-down contract creation dialog — without retention bond, retention %, start/end dates, warranty, terms & conditions, or contract type. It should have Project Number, PO Number, and Estimate Amount, and both line items and change orders needed the ability to carry a cost code and a spec section.

### What was built

**Create Estimate fast path.** On a project's Vendors tab, the "Assign Vendor" picker now has two actions per vendor: the existing plain **Assign**, and a new **Create Estimate**. Create Estimate assigns the vendor to the project and immediately opens a trimmed dialog with only:
- **PO Number** (your convention of job number + primary CSI code fits directly here)
- **Estimate Amount**
- **Project Number**, shown read-only for context

No retention, dates, warranty, terms, or contract type fields — those stay available on the full "Add Contract" form on a vendor's own page for when a complete formal contract is needed later. Submitting takes you straight to the new estimate's page, ready to add line items.

**Project Number.** Projects now have a real Project Number (job number) field — editable from the project's edit dialog and shown in the project header. It's what populates the read-only field in the Create Estimate dialog.

**Cost Code and Spec Section on line items and change orders.** Both contract line items and change order line items can now be tagged with:
- A **Cost Code**, picked from your company's Cost Code Directory (the same directory introduced earlier)
- A **Spec Section** (free-text, e.g. "03 30 00")

Both show as small badges under the line item description once set.

**Also fixed along the way:** PO/contract numbers were previously required to be unique across the *entire platform*, not just within your own company — meaning two unrelated companies could never use the same PO number, which was a real risk given the job-number-based convention described above. This is now scoped correctly per company.

### Where to find it
- Any project → **Vendors tab** → "Assign Vendor" → **Create Estimate**
- Project edit dialog → **Project Number** field
- A contract's **Line Items** and **Change Orders** sections → Cost Code and Spec Section fields on each item

---

## 4. Contract Dashboard Fixes and Subtiers/Suppliers

**Date:** July 14, 2026
**Status:** Implemented and verified

### What was requested
A batch of feedback on the vendor contract detail page: the contract value summary should show the original estimate; the header should show company, job, contract number, status, and retention; Terms & Conditions needed to be separate from Notes and not required at this stage; the "Project" info on the dashboard should really be about subtiers/suppliers (feeding into lien releases); one save button instead of several; the ability to set line items when creating a contract; a bug where the contract value doesn't update without a manual refresh; the ability to approve internal-only change orders without sending them to the subcontractor first; and a bug where approved change orders weren't reflected in the contract's current value.

### What was built

**Contract Value Summary now shows the original estimate.** Once line items are added to a contract, the contract's running total is correctly recalculated from those line items (as before) — but the original Estimate Amount is now preserved separately and always shown for reference, alongside Original Contract, Approved Change Orders, and Current Value.

**Header now shows company, job, contract number, status, and retention** in one line — including a new "Job" entry linking to the project this contract is for, which wasn't shown anywhere on the page before.

**One Edit / Save Changes button** replaces the old scattered per-field saves. Clicking Edit makes retention %, retention bond, and notes editable inline, plus opens up Terms & Conditions editing; one Save Changes button in the header commits everything together. Terms & Conditions now lives in its own slide-out panel (clearly optional, not required at this stage), separate from Notes.

**Line items can be added while creating an estimate**, not just afterward — the Create Estimate dialog now has an optional, repeatable line-item builder (with Cost Code and Spec Section per item), so you're not forced to leave the creation flow just to break the estimate into line items.

**Fixed: contract value not updating without a manual refresh.** This affected both editing line items and approving change orders — the underlying numbers were always correct, but the page's cached data wasn't being refreshed automatically. Both now update immediately.

**Change orders can now be approved directly**, without first "submitting" them to the subcontractor — a new "Approve Directly" option sits next to "Submit" for internal-only modifications you don't intend to send out. Approved change orders now correctly add to the contract's current value right away (see the refresh fix above).

**New: Subtiers / Suppliers on a contract, feeding Lien Releases.** The old read-only "Projects" list on the contract dashboard (project info moved up into the header) is replaced with a Subtiers/Suppliers section — pick which of this vendor's suppliers are working under this specific contract (or add a new one on the spot). When filing a Lien Release, you can now optionally specify which supplier/subtier it's for, instead of it always being attributed to the top-level vendor.

### Where to find it
- Any vendor contract page → header **Edit** button, and the **Terms & Conditions** panel
- Any vendor contract page → **Contract Value Summary** (now includes Contract Estimate)
- Any vendor contract page → **Subtiers / Suppliers** section
- **Create Estimate** dialog (project Vendors tab) → optional line-item builder
- A contract's **Change Orders** section → "Approve Directly" on draft change orders
- A contract's **Lien Releases** → new Supplier/Subtier field when creating a release

---

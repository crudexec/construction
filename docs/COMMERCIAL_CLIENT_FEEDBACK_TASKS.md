# Commercial Real Estate Client Feedback - Implementation Plan

> **Client Focus:** Commercial Real Estate / Construction Project Management
> **Date Created:** 2026-02-17
> **Status:** Planning Phase

---

## Executive Summary

This document captures feedback from a commercial real estate client and organizes it into actionable implementation tasks. The feedback primarily focuses on the Vendor/Contacts module with implications for the broader platform architecture.

---

## Future Considerations (Noted for Later)

These items were mentioned but explicitly deferred for future discussion:

- **Plans/Sheets Management** - OCR for plan reading, detail linking, markups, versioning
- **Specifications** - Document management for specs
- **"As Built" Documentation** - During and after construction tracking
- **Owner-facing Documents** - RFIs, CCDs, COPs, CORs (complex workflow)
- **Tax Implications** - Variable tax handling on POs and contracts

---

## Phase 1: UX Foundation & Desktop Optimization

### 1.1 Desktop-First UI Redesign
Commercial PMs and superintendents use 2-3 27" monitors. The UI needs to be optimized for this workflow.

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Implement condensable/collapsible UI sections | High | Medium | Allow users to minimize whitespace |
| Add column visibility customization | High | Medium | Let users show/hide columns per view |
| Add column reordering (drag & drop) | High | Medium | User preference persistence needed |
| Implement adjustable row/card spacing | Medium | Low | Density toggle (compact/normal/comfortable) |
| Increase clickable areas on cards/tiles | High | Low | Entire vendor tile should be clickable, not just "View Details" |

### 1.2 Enhanced Clickability & Navigation
Everything should be clickable and lead somewhere useful.

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Make vendor name/tile fully clickable | High | Low | Navigate to vendor detail |
| Make "Active Projects" counts clickable | High | Low | Show list of projects on click |
| Make all metrics clickable with drill-down | Medium | Medium | Any number should expand to show details |
| Implement breadcrumb navigation | Medium | Low | Clear path back through hierarchy |

---

## Phase 2: Vendor Module Enhancements

### 2.1 Vendor Dashboard Improvements

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Add "Primary Contact" designation & display | High | Medium | Show primary contact in dashboard card |
| Review/remove 2nd line in vendor name | Medium | Low | Clarify or remove if unnecessary |
| Add Project Name/Number columns | High | Low | Associate vendors with projects |
| Implement vendor "Type" system | High | High | See Type/Services section below |

### 2.2 Vendor Type & Services System

This is flagged as potential "secret sauce" for the platform.

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Create flexible vendor Type field | High | Medium | Variable based on contractor type |
| Add CSI Division as column option | High | Medium | Standard construction classification |
| Implement Services as tags system | High | High | HVAC: service vs new construction vs residential vs commercial |
| Build tag-based filtering | High | Medium | Filter vendors by service capabilities |
| Make tagging system reusable | Medium | High | Architecture for use in other modules |

### 2.3 Vendor Detail Page

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Collapsible vendor info section | Medium | Low | Limited info on collapse, full on expand |
| Multi-location support for vendors | High | High | Vendors have multiple offices/locations |
| Location-specific relationship tracking | High | High | Relationship tied to specific location |
| Add attachments to comments | High | Medium | Upload files with comments |
| Make contacts within vendor clickable | High | Low | Navigate to contact detail |
| Add comment ability on individual contacts | High | Medium | Comments per contact, not just vendor |

---

## Phase 3: Vendor Scoring System

### 3.1 On-Demand Interaction-Based Scoring
Build a comprehensive vendor score based on on-demand ratings (user initiates rating when they choose, not forced after every interaction).

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Design multi-dimensional scoring model | High | High | Multiple rating categories per review |
| Create on-demand rating UI | High | Medium | "Add Review" button - user chooses when to rate |
| Associate ratings with projects | High | Medium | Each review linked to specific project context |
| Build aggregate scoring algorithm | High | High | Calculate overall score from all reviews |
| Display score breakdown on vendor profile | Medium | Medium | Show component scores, not just total |
| Add score filtering to vendor search | Medium | Medium | Filter/sort by score |
| Show rating history timeline | Medium | Low | All reviews over time with project context |

**Scoring Dimensions to Consider:**
- Quality of work
- Timeliness
- Communication
- Pricing accuracy
- Safety compliance
- Problem resolution
- Documentation quality

---

## Phase 4: Milestones & Tasks

### 4.1 Milestone Enhancements

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Filter milestones by job/project | High | Medium | Same vendor on 4 jobs = need per-job view |
| Add checklists to individual milestones | High | Medium | Sub-tasks within a milestone |
| Add status to checklist items | High | Low | Track completion of sub-items |
| Make milestones editable | High | Low | Currently read-only? |
| Make milestones clickable | High | Low | Navigate/expand on click |

### 4.2 Milestone Contact Linking

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Link milestones to internal contacts | High | Medium | Assign your employees to milestones |
| Link milestones to external contacts | High | Medium | Assign vendor contacts to milestones |
| Separate "responsible" vs "documenter" | Medium | Medium | Person assigned may not be the one updating |

---

## Phase 5: Comments System Overhaul

### 5.1 Comment Filtering & Organization

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Toggle: All historical comments | High | Medium | View everything |
| Toggle: Current contacts/employees | High | Medium | Filter by active relationships |
| Toggle: Former employees | Medium | Medium | Historical context from departed staff |
| Toggle: Company-level comments | High | Low | Comments about the company vs individuals |
| Anchor/pin comments to top | High | Low | Flag critical information |
| Flag comments as critical | High | Low | Visual indicator for important notes |

### 5.2 Admin & Privacy Features

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Private admin-only comments | High | Medium | Internal notes not visible to all users |
| Comment visibility permissions | Medium | High | Control who sees what comments |

### 5.3 Comment Linking

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Link comments to assets | Medium | Medium | "Purchased X machine from this vendor" |
| Link comments to projects | Medium | Medium | Context for when comment was made |
| Link comments to contracts | Medium | Medium | Reference specific agreements |

---

## Phase 6: Document Generation

> **Clarified Requirement:** Client creates their own templates with placeholder variables. At generation time, dynamic content is inserted into those placeholders.

### 6.1 Template Builder System

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Template creation UI | High | High | WYSIWYG or rich text editor for templates |
| Variable/placeholder system | High | High | Define available variables (vendor name, address, project, etc.) |
| Variable picker/inserter | High | Medium | Easy way to insert `{{vendor.name}}` style placeholders |
| Template preview with sample data | Medium | Medium | See how template looks with real data |
| Template categorization | Medium | Low | Organize by document type |
| Template versioning | Medium | Medium | Track template changes over time |

### 6.2 Document Generation Engine

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Variable substitution engine | High | High | Parse templates and replace placeholders |
| Dynamic content injection | High | High | Add line items, tables, lists at generation |
| PDF export | High | Medium | Generate downloadable PDFs |
| Generated document storage | High | Medium | Save generated docs with audit trail |
| Re-generate from updated template | Medium | Medium | Update existing docs when template changes |

### 6.3 Standard Document Types (Templates to Support)

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Intent to Award letter | High | Medium | Basic template with vendor/project data |
| Purchase Order | High | High | Line items, totals, terms |
| Subcontract | High | High | Complex with schedules, terms, scope |
| Contract Modification / Change Order | High | High | Reference original, show changes |
| Non-Compliance Notice | Medium | Medium | Formal notification with details |

---

## Phase 7: Contract Management

> **Clarified Requirement:** Full cost tracking with line items. Formula: Original Contract + Sum of Change Orders = Current Contract Value

### 7.1 Contract Value Tracking

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Original contract value with line items | High | High | Itemized breakdown of original scope |
| Line item data model | High | High | Description, quantity, unit, unit price, total |
| Contract summary calculations | High | Medium | Auto-calculate totals from line items |

### 7.2 Change Order System

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Change order creation UI | High | High | Add COs to existing contracts |
| CO line items | High | High | Each CO has its own itemized breakdown |
| CO numbering/sequencing | High | Low | CO #1, CO #2, etc. |
| CO status workflow | High | Medium | Draft, Pending Approval, Approved, Rejected |
| CO reason/justification field | Medium | Low | Why the change is needed |
| Running total calculation | High | Medium | Original + CO1 + CO2 + ... = Current Value |
| CO history/audit trail | High | Medium | Full history of all modifications |

### 7.3 Contract Dashboard

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Display original value | High | Low | Show base contract amount |
| Display total change orders | High | Low | Sum of all approved COs |
| Display current contract value | High | Low | Original + COs |
| Variance tracking | Medium | Medium | % change from original |
| CO count indicator | Medium | Low | "3 Change Orders" badge |

### 7.4 Contract Flexibility

| Task | Priority | Complexity | Notes |
|------|----------|------------|-------|
| Make end date optional | High | Low | Not always known at contract start |
| Add contract status workflow | Medium | Medium | Draft, Active, Complete, etc. |
| Contract document attachments | Medium | Low | Store actual contract PDFs |

---

## Technical Debt & Architecture Notes

### Database Schema Changes Needed
- Vendor locations (multi-location support)
- Contact-level comments
- Vendor services/tags
- Scoring system tables (reviews, dimensions, scores)
- Contract line items table
- Change orders table with line items
- Change order status/workflow
- Document templates table
- Generated documents table
- Comment visibility/privacy flags

### Component Architecture
- Reusable tagging system (for vendors, and later other entities)
- Configurable data tables (column visibility, ordering, density)
- Comment system with filtering and permissions
- Template builder with variable picker
- Document generation engine with placeholder substitution
- Line item editor component (reusable for contracts, COs, POs)
- Running total calculator for contract values

---

## Clarified Requirements

| Item | Decision |
|------|----------|
| **Vendor Scoring** | On-demand rating (user initiates when they choose, not forced) |
| **Document Templates** | Client creates templates with placeholders; dynamic content injected at generation |
| **Change Orders** | Full line-item tracking: Original Contract + Sum of COs = Current Value |

---

## Open Questions for Client Discussion

1. **Scoring Dimensions:** What are the most important dimensions to rate vendors on? Should scores be weighted?

2. **Milestone Assignments:** When a milestone is assigned to both an internal and external contact, who gets notified? What's the workflow?

3. **Private Comments:** Who should see admin-only comments? All admins? Only specific roles?

4. **Template Variables:** What data fields are most commonly needed in document templates? (vendor info, project info, line items, dates, etc.)

5. **Multi-Location Vendors:** How should we handle vendors with multiple locations? Separate entries or one vendor with location sub-records?

6. **CSI Divisions:** Should we use standard CSI MasterFormat divisions, or allow custom classification?

---

## Priority Matrix

### Must Have (P0)
- Desktop-optimized condensable UI
- Clickable navigation throughout
- Milestone filtering by project
- Primary contact designation
- Vendor type/services tagging
- Change order support with line items
- Contract value tracking (Original + COs = Current)

### Should Have (P1)
- On-demand vendor scoring system
- Comment filtering and privacy
- Document template builder (client-created templates)
- Document generation engine
- Multi-location vendor support

### Nice to Have (P2)
- Digital signatures
- Advanced scoring analytics
- Template versioning
- Mobile-specific optimizations

---

## Next Steps

1. Review this document with client on upcoming call
2. Prioritize Phase 1 & 2 for immediate implementation
3. Create detailed technical specs for vendor scoring system
4. Design database schema changes
5. Begin iterative development with client feedback loops

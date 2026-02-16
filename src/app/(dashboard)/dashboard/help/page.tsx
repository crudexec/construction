'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  ChevronDown,
  ChevronRight,
  Book,
  HelpCircle,
  Briefcase,
  CheckSquare,
  Users,
  ShoppingCart,
  Package,
  Wrench,
  Bell,
  Settings,
  FileText,
  LayoutDashboard,
  Calendar,
  DollarSign,
  Truck,
  ClipboardList,
  MessageSquare,
  Shield,
  Zap,
  ExternalLink
} from 'lucide-react'

// Help content data structure
interface FAQ {
  question: string
  answer: string
}

interface Article {
  title: string
  description: string
  content: string[]
}

interface HelpCategory {
  id: string
  title: string
  icon: React.ElementType
  description: string
  faqs: FAQ[]
  articles: Article[]
}

const helpCategories: HelpCategory[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Zap,
    description: 'Learn the basics of BuildFlow and get up and running quickly',
    faqs: [
      {
        question: 'How do I get started with BuildFlow?',
        answer: 'After logging in, you\'ll see the main dashboard with your project pipeline. Start by going to Settings to configure your company details, then create your first project by clicking "Add Project" on the Projects page.'
      },
      {
        question: 'How do I invite team members?',
        answer: 'Go to Settings > Team tab, click "Invite Team Member", enter their details and role, then send the invitation. They\'ll receive an email with a link to create their account.'
      },
      {
        question: 'What are the different user roles?',
        answer: 'BuildFlow has four roles: ADMIN (full access, can manage settings and users), STAFF (can manage projects, tasks, and vendors), SUBCONTRACTOR (limited access to assigned tasks), and CLIENT (view-only access to their projects).'
      },
      {
        question: 'How do I configure email notifications?',
        answer: 'Go to Settings > Email Configuration to set up your email provider (SendGrid, Resend, or SMTP). Then configure your notification preferences in the Notifications tab.'
      },
      {
        question: 'Can I customize the company branding?',
        answer: 'Yes! Go to Settings > Company tab where you can set your company name, logo, and application name that appears throughout the system.'
      }
    ],
    articles: [
      {
        title: 'Quick Start Guide',
        description: 'Get up and running with BuildFlow in 10 minutes',
        content: [
          'Welcome to BuildFlow! This guide will help you set up your account and start managing your construction projects.',
          '1. Configure Company Settings: Go to Settings > Company and add your company details including name, address, and currency.',
          '2. Set Up Email: Configure your email provider in Settings > Email Configuration to enable notifications.',
          '3. Invite Your Team: Add team members via Settings > Team. Assign appropriate roles based on their responsibilities.',
          '4. Create Your First Project: Go to Projects and click "Add Project". Fill in the project details and client information.',
          '5. Add Tasks: Within your project, create tasks and assign them to team members with due dates.',
          '6. Set Up Vendors: Add your suppliers and subcontractors in the Vendors section for easy management.'
        ]
      },
      {
        title: 'Understanding the Dashboard',
        description: 'Navigate the main dashboard and project pipeline',
        content: [
          'The main dashboard displays your project pipeline using a Kanban board layout.',
          'Projects are organized into stages (columns) that represent their current status in your workflow.',
          'Drag and drop projects between stages to update their status.',
          'Each project card shows key information including title, client name, and progress indicators.',
          'Click on any project card to view full details, tasks, documents, and more.',
          'Use the sidebar navigation to access different areas: Projects, Vendors, Purchase Orders, Inventory, Assets, and Settings.'
        ]
      }
    ]
  },
  {
    id: 'projects',
    title: 'Projects & Leads',
    icon: Briefcase,
    description: 'Managing projects, leads, and client relationships',
    faqs: [
      {
        question: 'How do I create a new project?',
        answer: 'Click "Add Project" on the Projects page or use the quick add button. Fill in the project title, client details, budget, and other relevant information. The project will be added to your first pipeline stage.'
      },
      {
        question: 'What\'s the difference between a lead and a project?',
        answer: 'In BuildFlow, leads and projects are managed in the same pipeline. Typically, early stages represent leads (potential work), while later stages represent active projects. You can customize your stages to match your workflow.'
      },
      {
        question: 'How do I move a project between stages?',
        answer: 'Drag and drop the project card to the desired stage column on the Kanban board. Alternatively, open the project and change the stage from the project details.'
      },
      {
        question: 'How do I assign team members to a project?',
        answer: 'Open the project, go to the Team tab, and click "Add Team Member". Select from your company\'s users to add them to the project team.'
      },
      {
        question: 'Can clients view their project progress?',
        answer: 'Yes! Enable the Client Portal for a project and share the unique link with your client. You can configure what information they can see in the Portal Settings.'
      },
      {
        question: 'How do I archive or delete a project?',
        answer: 'Open the project and use the status dropdown to change it to "Archived" or "Completed". Projects can also be deleted from the project settings, but this action cannot be undone.'
      },
      {
        question: 'What are project milestones?',
        answer: 'Milestones are significant checkpoints in your project. Create milestones to track major deliverables, payment stages, or important deadlines. You can assign vendors to milestones and track their completion.'
      }
    ],
    articles: [
      {
        title: 'Managing Your Project Pipeline',
        description: 'Organize and track projects through your workflow stages',
        content: [
          'Your project pipeline represents the stages a project goes through from initial lead to completion.',
          'Default stages typically include: New Lead, Qualified, Proposal Sent, Negotiation, Won, In Progress, and Completed.',
          'Customize your stages by going to Settings and modifying your workflow to match your business process.',
          'Use the Kanban board view to get a visual overview of all projects and their current status.',
          'Set up stage-based automations to trigger notifications when projects move between stages.',
          'Track conversion rates by monitoring how many projects move from lead stages to active work.'
        ]
      },
      {
        title: 'Client Portal Setup',
        description: 'Give clients visibility into their project progress',
        content: [
          'The Client Portal allows your clients to view their project status without logging in.',
          'To enable: Open a project, go to Settings, and click "Enable Client Portal".',
          'A unique, secure link will be generated that you can share with your client.',
          'Configure visibility settings to control what clients can see: progress, timeline, budget, tasks, documents, and messages.',
          'Clients can send messages through the portal, which appear in your project\'s Messages tab.',
          'Disable the portal at any time if you need to revoke access.'
        ]
      },
      {
        title: 'Bill of Quantities (BOQ)',
        description: 'Create and manage detailed cost breakdowns',
        content: [
          'BOQ (Bill of Quantities) helps you create detailed cost estimates for your projects.',
          'Access BOQ from the project detail page under the BOQ tab.',
          'Add line items with descriptions, quantities, unit rates, and categories.',
          'The system automatically calculates totals and tracks variances between estimated and actual costs.',
          'Link BOQ items to procurement items for seamless purchase order creation.',
          'Use contingency flags to mark items that may have variable costs.',
          'Export BOQ reports for client proposals or internal planning.'
        ]
      }
    ]
  },
  {
    id: 'tasks',
    title: 'Tasks & Assignments',
    icon: CheckSquare,
    description: 'Creating, assigning, and tracking tasks',
    faqs: [
      {
        question: 'How do I create a task?',
        answer: 'Open a project, go to the Tasks tab, and click "Add Task". Fill in the title, description, assignee, due date, and priority. Tasks can also be assigned to vendors or milestones.'
      },
      {
        question: 'How do I assign a task to someone?',
        answer: 'When creating or editing a task, select an assignee from the dropdown. You can assign tasks to team members or vendors. The assignee will receive a notification about their new task.'
      },
      {
        question: 'What do the task statuses mean?',
        answer: 'TODO: Not started, IN_PROGRESS: Currently being worked on, COMPLETED: Finished, CANCELLED: No longer needed. Tasks past their due date may also show as OVERDUE.'
      },
      {
        question: 'How do task priorities work?',
        answer: 'Tasks can be set to LOW, MEDIUM, HIGH, or URGENT priority. Higher priority tasks are highlighted and can be filtered for easy identification.'
      },
      {
        question: 'Can I add comments to tasks?',
        answer: 'Yes! Open a task and use the Comments section to add notes, updates, or questions. Use @mentions to notify specific team members in your comments.'
      },
      {
        question: 'How do I share a task with someone outside my team?',
        answer: 'Open the task and click "Share Task" to generate a unique link. Anyone with this link can view the task details and even update its status.'
      },
      {
        question: 'What is task escalation?',
        answer: 'If a task needs urgent attention, you can escalate it. This flags the task and notifies the project owner. Escalated tasks are highlighted in the task list.'
      },
      {
        question: 'How do I track time on tasks?',
        answer: 'Task time tracking is available through the task details. You can log hours worked and add notes about the work performed.'
      }
    ],
    articles: [
      {
        title: 'Effective Task Management',
        description: 'Best practices for organizing and completing work',
        content: [
          'Good task management is key to successful project delivery.',
          'Break down large work items into smaller, actionable tasks that can be completed in a few hours or days.',
          'Always assign a due date - tasks without deadlines tend to be deprioritized.',
          'Use task categories to organize work by type (e.g., Site Work, Procurement, Documentation).',
          'Set up task dependencies to ensure work is done in the right order.',
          'Review overdue tasks daily and either complete them, reschedule, or escalate as needed.',
          'Use the calendar view to see task deadlines alongside project milestones.'
        ]
      },
      {
        title: 'Using @Mentions',
        description: 'Collaborate effectively with mentions in comments',
        content: [
          '@Mentions allow you to notify specific team members in task comments.',
          'Type @ followed by the person\'s name to mention them.',
          'Mentioned users receive both in-app and email notifications (based on their preferences).',
          'Use mentions to ask questions, request reviews, or bring attention to important updates.',
          'Mentions work in both task comments and vendor comments.'
        ]
      }
    ]
  },
  {
    id: 'vendors',
    title: 'Vendors & Contracts',
    icon: Users,
    description: 'Managing vendors, subcontractors, and contracts',
    faqs: [
      {
        question: 'How do I add a new vendor?',
        answer: 'Go to Vendors and click "Add Vendor". Enter the vendor\'s company name, contact details, and type (Supply, Installation, or Supply & Installation). You can also add multiple contacts for each vendor.'
      },
      {
        question: 'What is the Vendor Portal?',
        answer: 'The Vendor Portal allows your vendors to log in and view their assigned tasks, contracts, and milestones. Enable portal access from the vendor\'s profile page.'
      },
      {
        question: 'How do I create a contract with a vendor?',
        answer: 'Go to the vendor\'s profile, click the Contracts tab, and click "Add Contract". Enter the contract details including type, value, retention percentage, and duration.'
      },
      {
        question: 'How do I track vendor payments?',
        answer: 'Open a contract and use the Payments tab to record payments. You can track the payment amount, date, invoice number, and notes. The system calculates the remaining balance automatically.'
      },
      {
        question: 'How do I rate a vendor?',
        answer: 'From the vendor\'s profile, go to the Reviews tab and click "Add Review". Rate the vendor on quality, timeliness, communication, and professionalism, and add optional comments.'
      },
      {
        question: 'Can vendors see their ratings?',
        answer: 'Yes, vendors can view their ratings and reviews through their portal. This encourages transparency and accountability.'
      },
      {
        question: 'How do vendor statuses work?',
        answer: 'Vendors can be: PENDING_VERIFICATION (new), VERIFIED (approved), SUSPENDED (temporarily inactive), BLACKLISTED (banned), or INACTIVE. Only verified vendors can access the portal.'
      }
    ],
    articles: [
      {
        title: 'Vendor Management Best Practices',
        description: 'Build strong relationships with your vendors',
        content: [
          'Maintain accurate vendor records with up-to-date contact information.',
          'Regularly review vendor performance using the rating system.',
          'Use the price comparison feature to track vendor pricing over time.',
          'Set up preferred vendors for specific item categories to streamline procurement.',
          'Keep contract documents attached to vendor contracts for easy reference.',
          'Enable vendor portal access to improve communication and task visibility.'
        ]
      },
      {
        title: 'Contract Types Explained',
        description: 'Understanding different contract arrangements',
        content: [
          'LUMP_SUM: A fixed total price for all work, regardless of actual costs incurred.',
          'REMEASURABLE: Payment based on actual quantities of work done at agreed unit rates.',
          'ADDENDUM: Additional work added to an existing contract.',
          'Set retention percentages to hold back a portion of payment until project completion.',
          'Track warranty periods to know when vendor guarantees expire.',
          'Use the contract status (Draft, Active, Completed, Terminated, Expired) to manage contract lifecycles.'
        ]
      }
    ]
  },
  {
    id: 'purchase-orders',
    title: 'Purchase Orders',
    icon: ShoppingCart,
    description: 'Creating and managing purchase orders',
    faqs: [
      {
        question: 'How do I create a purchase order?',
        answer: 'Go to Purchase Orders and click "New Purchase Order". Select a vendor, add line items from your procurement catalog, set quantities and prices, then save. POs start in Draft status.'
      },
      {
        question: 'What is the PO approval workflow?',
        answer: 'POs go through stages: DRAFT (being created), APPROVED (ready to send), SENT (sent to vendor), PARTIALLY_RECEIVED (some items received), RECEIVED (all items received), or CANCELLED.'
      },
      {
        question: 'How do I approve a purchase order?',
        answer: 'Open a draft PO and click "Approve". You must have the appropriate permissions. Once approved, the PO can be sent to the vendor.'
      },
      {
        question: 'How do I send a PO to a vendor?',
        answer: 'After approval, click "Send to Vendor". The vendor will receive an email notification with the PO details. The PO status changes to SENT.'
      },
      {
        question: 'How do I receive items against a PO?',
        answer: 'Open a sent PO and click "Receive Items". Enter the quantity received for each line item. You can do partial receipts if not all items arrived.'
      },
      {
        question: 'Can I link POs to specific projects?',
        answer: 'Yes! When creating a PO, select the project it relates to. This helps track project costs and links the PO to your BOQ items.'
      },
      {
        question: 'How do I view PO history?',
        answer: 'The Purchase Orders page shows all POs with filters for status, vendor, and project. You can also view vendor-specific POs from the vendor profile.'
      }
    ],
    articles: [
      {
        title: 'Purchase Order Workflow',
        description: 'From creation to receipt',
        content: [
          'The purchase order workflow ensures proper approval and tracking of all purchases.',
          '1. Create: Add items, quantities, and pricing. PO starts as Draft.',
          '2. Review: Check all details are correct before approval.',
          '3. Approve: Admin or authorized staff approves the PO.',
          '4. Send: Email the PO to the vendor for fulfillment.',
          '5. Track: Monitor expected delivery dates.',
          '6. Receive: Record items as they arrive, supporting partial receipts.',
          '7. Complete: Once all items received, PO is marked as complete.',
          'At any stage before sending, you can modify or cancel the PO.'
        ]
      },
      {
        title: 'Managing Procurement Items',
        description: 'Build your catalog of materials and supplies',
        content: [
          'Procurement items are your catalog of materials, supplies, and services.',
          'Add items with SKU codes, descriptions, units of measure, and categories.',
          'Set preferred vendors for each item to streamline PO creation.',
          'Track price quotes from multiple vendors for comparison.',
          'Link procurement items to BOQ items for cost tracking.',
          'Use categories to organize items (e.g., Electrical, Plumbing, Finishing).'
        ]
      }
    ]
  },
  {
    id: 'inventory',
    title: 'Inventory Management',
    icon: Package,
    description: 'Tracking materials and stock levels',
    faqs: [
      {
        question: 'How do I add inventory items?',
        answer: 'Go to Inventory and click "Add Material". Enter the item name, category, initial quantity, unit of measure, and minimum stock level for alerts.'
      },
      {
        question: 'How do I track stock movements?',
        answer: 'Use "Stock In" to record incoming materials (purchases, returns) and "Stock Out" to record usage or transfers. All movements are logged with timestamps and user information.'
      },
      {
        question: 'How do low stock alerts work?',
        answer: 'When an item\'s quantity falls to or below its minimum stock level, the system sends alerts via email and/or SMS to configured recipients. Set up alerts in the Inventory settings.'
      },
      {
        question: 'Can I track inventory per project?',
        answer: 'Yes! When recording stock out, you can assign the usage to a specific project. This helps track material costs at the project level.'
      },
      {
        question: 'How do I view inventory history?',
        answer: 'Click on any inventory item to see its full transaction history including all stock in/out movements, purchase records, and running balance.'
      },
      {
        question: 'How do I set up inventory categories?',
        answer: 'Go to Inventory and use the Categories section to create categories like Electrical, Plumbing, Finishing, etc. Assign colors for easy visual identification.'
      }
    ],
    articles: [
      {
        title: 'Inventory Best Practices',
        description: 'Keep accurate stock levels and reduce waste',
        content: [
          'Set realistic minimum stock levels based on lead times and usage patterns.',
          'Record stock movements in real-time to maintain accurate counts.',
          'Conduct periodic physical counts to verify system quantities.',
          'Use project allocation to track where materials are being used.',
          'Review slow-moving inventory to avoid tying up capital.',
          'Set up SMS alerts for critical items that could halt work if unavailable.'
        ]
      }
    ]
  },
  {
    id: 'assets',
    title: 'Asset Management',
    icon: Wrench,
    description: 'Managing equipment, vehicles, and tools',
    faqs: [
      {
        question: 'How do I add an asset?',
        answer: 'Go to Assets and click "Add Asset". Enter the asset name, type (Vehicle, Equipment, or Tool), serial number, purchase cost, and current location.'
      },
      {
        question: 'How do I request an asset?',
        answer: 'From the Assets page, find the asset and click "Request". Specify the project, purpose, and dates needed. Your request will be reviewed by an admin.'
      },
      {
        question: 'How does the asset request workflow work?',
        answer: 'Requests go through: PENDING (awaiting approval), APPROVED (asset assigned), REJECTED (request denied), RETURNED (asset back), or CANCELLED. Admins approve or reject pending requests.'
      },
      {
        question: 'How do I track asset maintenance?',
        answer: 'Each asset has a Maintenance tab where you can schedule one-time or recurring maintenance. Record maintenance completion with costs and notes.'
      },
      {
        question: 'What do the asset statuses mean?',
        answer: 'AVAILABLE: Ready for use, IN_USE: Currently assigned, UNDER_MAINTENANCE: Being serviced, RETIRED: No longer in service, LOST_DAMAGED: Missing or broken.'
      },
      {
        question: 'Can I add photos to assets?',
        answer: 'Yes! Go to the asset detail page and upload photos. This is useful for documenting asset condition before and after use.'
      }
    ],
    articles: [
      {
        title: 'Asset Tracking Guide',
        description: 'Keep track of your valuable equipment',
        content: [
          'Register all company assets including vehicles, heavy equipment, and tools.',
          'Assign unique asset IDs or use existing serial numbers for tracking.',
          'Use the request system to manage asset allocation across projects.',
          'Document asset condition with photos when checking in and out.',
          'Set up maintenance schedules to prevent breakdowns and extend asset life.',
          'Track purchase costs and maintenance expenses for financial planning.',
          'Mark assets as retired when they\'re no longer serviceable.'
        ]
      }
    ]
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: Bell,
    description: 'Managing alerts and communication preferences',
    faqs: [
      {
        question: 'What notifications does BuildFlow send?',
        answer: 'BuildFlow sends notifications for: task assignments, due date reminders, task completion, escalations, new leads, bid status changes, low stock alerts, purchase order approvals, payment recordings, milestone updates, and mentions in comments.'
      },
      {
        question: 'How do I configure my notification preferences?',
        answer: 'Go to Settings > Notifications. Toggle on/off specific notification types for email and SMS channels. You can also set quiet hours for SMS notifications.'
      },
      {
        question: 'How do I set up SMS notifications?',
        answer: 'First, configure SMS in Settings > SMS Configuration with your Africa\'s Talking credentials. Then enable SMS for specific notification types in your notification preferences.'
      },
      {
        question: 'What are quiet hours?',
        answer: 'Quiet hours prevent SMS notifications from being sent during specified times (e.g., overnight). Configure start and end hours in your notification preferences.'
      },
      {
        question: 'How do I view my notifications?',
        answer: 'Click the bell icon in the header to see your recent notifications. Unread notifications are highlighted. Click "Mark all as read" to clear them.'
      },
      {
        question: 'Can vendors receive notifications?',
        answer: 'Yes! Vendors can configure their notification preferences in their portal settings. They receive notifications about assigned tasks, purchase orders, and contract updates.'
      }
    ],
    articles: [
      {
        title: 'Setting Up Email Notifications',
        description: 'Configure email delivery for your team',
        content: [
          'BuildFlow supports multiple email providers: SendGrid, Resend, and SMTP.',
          'Go to Settings > Email Configuration to set up your provider.',
          'Enter your API key or SMTP credentials and test the connection.',
          'Once configured, emails will be sent for enabled notification types.',
          'Each user can customize which notifications they receive via email.',
          'Customize your company name and branding in email templates.'
        ]
      },
      {
        title: 'SMS Notifications with Africa\'s Talking',
        description: 'Send SMS alerts to your team',
        content: [
          'BuildFlow integrates with Africa\'s Talking for SMS delivery.',
          'Sign up at africastalking.com and get your API credentials.',
          'Enter your username, API key, and optional sender ID in Settings > SMS Configuration.',
          'Test the connection by sending a test message.',
          'Enable SMS for critical notifications like overdue tasks and low stock alerts.',
          'Set quiet hours to avoid sending messages during off-hours.'
        ]
      }
    ]
  },
  {
    id: 'settings',
    title: 'Settings & Administration',
    icon: Settings,
    description: 'Configuring your BuildFlow workspace',
    faqs: [
      {
        question: 'How do I update company information?',
        answer: 'Go to Settings > Company tab. Update your company name, address, contact details, and currency. The company name appears on documents and notifications.'
      },
      {
        question: 'How do I manage team members?',
        answer: 'Go to Settings > Team tab to view all users. Invite new members, change roles, reset passwords, or deactivate accounts. Deactivated users can be reactivated by re-inviting them.'
      },
      {
        question: 'How do I change a user\'s role?',
        answer: 'In Settings > Team, find the user and click the edit icon. Select a new role from the dropdown. Note: You cannot change your own admin role.'
      },
      {
        question: 'How do I reset a user\'s password?',
        answer: 'In Settings > Team, find the user and click "Reset Password". Enter a new password (minimum 8 characters) and save. The user will need to use this password on their next login.'
      },
      {
        question: 'How do I set up project templates?',
        answer: 'Go to Settings > Templates to create reusable project templates. Add default tasks, folders, and budget items that will be automatically created when using the template.'
      },
      {
        question: 'Can I customize the currency?',
        answer: 'Yes! Set your preferred currency in Settings > Company. This affects how amounts are displayed throughout the system, including projects, POs, and reports.'
      }
    ],
    articles: [
      {
        title: 'User Roles and Permissions',
        description: 'Understanding access levels in BuildFlow',
        content: [
          'ADMIN: Full access to all features including settings, user management, and configuration. Can approve purchase orders and manage all projects.',
          'STAFF: Can manage projects, tasks, vendors, and POs. Cannot access admin settings or user management.',
          'SUBCONTRACTOR: Limited access to assigned tasks and projects. Can update task status and add comments.',
          'CLIENT: Read-only access to their specific projects through the client portal.',
          'Choose roles carefully based on each user\'s responsibilities.',
          'Only ADMINs can invite new users and modify settings.'
        ]
      },
      {
        title: 'Data Export and Backup',
        description: 'Exporting your data from BuildFlow',
        content: [
          'Export project reports as PDF from the project detail page.',
          'Download BOQ data for external use.',
          'Export inventory lists and transaction history.',
          'Activity logs can be filtered and exported for auditing.',
          'Contact support for full data export or migration assistance.'
        ]
      }
    ]
  },
  {
    id: 'documents',
    title: 'Documents & Files',
    icon: FileText,
    description: 'Managing project documents and attachments',
    faqs: [
      {
        question: 'How do I upload documents to a project?',
        answer: 'Open a project, go to the Documents tab, and click "Upload". You can upload multiple files at once. Organize files into folders for better management.'
      },
      {
        question: 'How do I create folders?',
        answer: 'In the Documents tab, click "New Folder". Name the folder and optionally assign a color. Folders can be nested inside other folders.'
      },
      {
        question: 'Can I attach files to tasks?',
        answer: 'Yes! Open a task and use the Attachments section to upload files. Team members and vendors (if assigned) can view and download attachments.'
      },
      {
        question: 'Are there file size limits?',
        answer: 'Individual files can be up to 10MB. For larger files, consider using external storage and linking to the files in task descriptions or comments.'
      },
      {
        question: 'How do I share documents with clients?',
        answer: 'Documents in a project are visible to clients through the Client Portal if you\'ve enabled document access in the portal settings.'
      },
      {
        question: 'Can I attach documents to contracts?',
        answer: 'Yes! Open a vendor contract and use the Documents tab to upload contract documents, agreements, and related files.'
      }
    ],
    articles: [
      {
        title: 'Document Organization Tips',
        description: 'Keep your project files organized',
        content: [
          'Create a consistent folder structure across projects (e.g., Contracts, Drawings, Photos, Reports).',
          'Use descriptive file names that include dates and version numbers.',
          'Upload documents as soon as they\'re created or received.',
          'Use folders to separate client-facing documents from internal files.',
          'Regularly review and archive outdated documents.',
          'Keep contract documents attached to the relevant vendor contract.'
        ]
      }
    ]
  },
  {
    id: 'estimates',
    title: 'Estimates & Quotations',
    icon: DollarSign,
    description: 'Creating and managing project estimates',
    faqs: [
      {
        question: 'How do I create an estimate?',
        answer: 'Open a project, go to the Estimates tab, and click "New Estimate". Add line items with descriptions, quantities, and prices. The system automatically calculates totals.'
      },
      {
        question: 'How do I send an estimate to a client?',
        answer: 'After creating an estimate, change its status from Draft to Sent. You can then share the estimate link with your client or export it as a PDF.'
      },
      {
        question: 'What are the estimate statuses?',
        answer: 'DRAFT: Being prepared, SENT: Shared with client, VIEWED: Client has opened it, ACCEPTED: Client approved, REJECTED: Client declined, EXPIRED: Past the valid date.'
      },
      {
        question: 'Can clients sign estimates?',
        answer: 'Yes! Clients can accept estimates and add a digital signature through the estimate view page.'
      },
      {
        question: 'How do I duplicate an estimate?',
        answer: 'Open an existing estimate and use the duplicate function to create a copy. This is useful for creating similar estimates or revisions.'
      }
    ],
    articles: [
      {
        title: 'Creating Professional Estimates',
        description: 'Win more work with clear, detailed quotes',
        content: [
          'Include a clear project description and scope of work.',
          'Break down costs into logical sections that clients can understand.',
          'Add notes explaining assumptions and exclusions.',
          'Set realistic validity dates (typically 30-60 days).',
          'Include payment terms and conditions.',
          'Export as PDF for a professional presentation.',
          'Track estimate status to follow up on pending quotes.'
        ]
      }
    ]
  },
  {
    id: 'daily-logs',
    title: 'Daily Logs & Reports',
    icon: ClipboardList,
    description: 'Recording daily site activities',
    faqs: [
      {
        question: 'What is a daily log?',
        answer: 'Daily logs are records of site activities including weather conditions, work performed, materials used, workers present, and any issues encountered.'
      },
      {
        question: 'How do I create a daily log?',
        answer: 'Open a project, go to the Daily Logs tab, and click "Add Log". Fill in the date, weather, work description, materials, workers, and any issues or notes.'
      },
      {
        question: 'Can I add photos to daily logs?',
        answer: 'Yes! Upload photos to document progress, issues, or site conditions. Photos are stored with the log entry.'
      },
      {
        question: 'Who can view daily logs?',
        answer: 'Project team members and admins can view daily logs. They can optionally be included in client portal access.'
      },
      {
        question: 'Can I export daily logs?',
        answer: 'Daily logs are included in project progress reports. You can generate a PDF report that includes recent daily log entries.'
      }
    ],
    articles: [
      {
        title: 'Writing Effective Daily Logs',
        description: 'Document your site activities properly',
        content: [
          'Record daily logs at the end of each workday while details are fresh.',
          'Always note weather conditions as they affect productivity.',
          'List all workers present including subcontractor crews.',
          'Document materials received and used.',
          'Note any delays, issues, or incidents.',
          'Add photos to support written descriptions.',
          'Be factual and objective in your descriptions.'
        ]
      }
    ]
  },
  {
    id: 'messaging',
    title: 'Messages & Communication',
    icon: MessageSquare,
    description: 'Communicating with your team and clients',
    faqs: [
      {
        question: 'How do I send a message on a project?',
        answer: 'Open a project and go to the Messages tab. Type your message and click send. All project team members will be able to see the message.'
      },
      {
        question: 'Can clients send messages?',
        answer: 'Yes! If the Client Portal is enabled with messaging access, clients can send messages that appear in the project\'s Messages tab.'
      },
      {
        question: 'How do I know if I have new messages?',
        answer: 'The Messages link in the sidebar shows an unread count. You\'ll also receive notifications based on your preferences.'
      },
      {
        question: 'Are messages private?',
        answer: 'Project messages are visible to all team members assigned to the project. For private communication, use external email or messaging.'
      }
    ],
    articles: [
      {
        title: 'Project Communication Tips',
        description: 'Keep everyone informed and aligned',
        content: [
          'Use project messages for discussions that the whole team should see.',
          'Be clear and concise in your messages.',
          'For task-specific discussions, use task comments instead.',
          'Enable client messaging for direct client communication.',
          'Check messages regularly and respond promptly.',
          'Use @mentions in task comments for urgent matters.'
        ]
      }
    ]
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    icon: Shield,
    description: 'Keeping your data safe',
    faqs: [
      {
        question: 'How secure is BuildFlow?',
        answer: 'BuildFlow uses industry-standard security practices including encrypted passwords, secure authentication tokens, and HTTPS encryption for all data transfer.'
      },
      {
        question: 'Who can see my data?',
        answer: 'Your data is isolated to your company. Only users you invite can access your company\'s projects, vendors, and other information. Clients only see their specific projects.'
      },
      {
        question: 'How do I change my password?',
        answer: 'Click your profile icon in the header and select "Change Password". Enter your current password and your new password twice to confirm.'
      },
      {
        question: 'What happens when I deactivate a user?',
        answer: 'Deactivated users cannot log in. Their historical data (tasks completed, comments, etc.) remains intact. You can reactivate them at any time.'
      },
      {
        question: 'How long is data retained?',
        answer: 'Your data is retained as long as your account is active. Deleted items are removed permanently. Contact support for data export needs.'
      }
    ],
    articles: [
      {
        title: 'Security Best Practices',
        description: 'Protect your account and data',
        content: [
          'Use strong, unique passwords for each user account.',
          'Only grant admin access to users who need it.',
          'Deactivate accounts promptly when team members leave.',
          'Review activity logs periodically for unusual activity.',
          'Keep your email secure as it\'s used for password resets.',
          'Train team members on security awareness.'
        ]
      }
    ]
  }
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set())
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())

  // Filter content based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return helpCategories

    const query = searchQuery.toLowerCase()
    return helpCategories.map(category => ({
      ...category,
      faqs: category.faqs.filter(
        faq => faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query)
      ),
      articles: category.articles.filter(
        article =>
          article.title.toLowerCase().includes(query) ||
          article.description.toLowerCase().includes(query) ||
          article.content.some(p => p.toLowerCase().includes(query))
      )
    })).filter(category => category.faqs.length > 0 || category.articles.length > 0)
  }, [searchQuery])

  const toggleFaq = (categoryId: string, index: number) => {
    const key = `${categoryId}-${index}`
    setExpandedFaqs(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const toggleArticle = (categoryId: string, index: number) => {
    const key = `${categoryId}-${index}`
    setExpandedArticles(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const currentCategory = selectedCategory
    ? filteredCategories.find(c => c.id === selectedCategory)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <HelpCircle className="w-12 h-12 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900">Help Center</h1>
            <p className="mt-2 text-lg text-gray-600">
              Everything you need to know about using BuildFlow
            </p>
          </div>

          {/* Search */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search for help articles, FAQs, and guides..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSelectedCategory(null)
                }}
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        {selectedCategory && (
          <button
            onClick={() => setSelectedCategory(null)}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 mb-6"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            <span>Back to all categories</span>
          </button>
        )}

        {/* Category Grid or Category Detail */}
        {!selectedCategory ? (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {helpCategories.reduce((acc, c) => acc + c.faqs.length, 0)}
                </div>
                <div className="text-gray-600">FAQs</div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {helpCategories.reduce((acc, c) => acc + c.articles.length, 0)}
                </div>
                <div className="text-gray-600">Help Articles</div>
              </div>
              <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {helpCategories.length}
                </div>
                <div className="text-gray-600">Topic Categories</div>
              </div>
            </div>

            {/* Categories */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {searchQuery ? 'Search Results' : 'Browse by Category'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCategories.map((category) => {
                const Icon = category.icon
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className="bg-white rounded-lg p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="bg-indigo-100 rounded-lg p-3">
                        <Icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{category.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{category.description}</p>
                        <div className="flex gap-4 mt-3 text-xs text-gray-500">
                          <span>{category.faqs.length} FAQs</span>
                          <span>{category.articles.length} Articles</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {filteredCategories.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No results found</h3>
                <p className="text-gray-600 mt-1">
                  Try searching with different keywords or browse the categories above.
                </p>
              </div>
            )}

            {/* Popular FAQs */}
            {!searchQuery && (
              <div className="mt-12">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Popular Questions</h2>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {helpCategories.slice(0, 3).flatMap(category =>
                    category.faqs.slice(0, 2).map((faq, idx) => (
                      <div key={`popular-${category.id}-${idx}`} className="p-4">
                        <button
                          onClick={() => {
                            setSelectedCategory(category.id)
                            setTimeout(() => toggleFaq(category.id, idx), 100)
                          }}
                          className="w-full text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">
                              {category.title}
                            </span>
                          </div>
                          <h4 className="font-medium text-gray-900 mt-2">{faq.question}</h4>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{faq.answer}</p>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        ) : currentCategory && (
          <div className="space-y-8">
            {/* Category Header */}
            <div className="flex items-center gap-4">
              <div className="bg-indigo-100 rounded-lg p-4">
                <currentCategory.icon className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentCategory.title}</h2>
                <p className="text-gray-600">{currentCategory.description}</p>
              </div>
            </div>

            {/* FAQs Section */}
            {currentCategory.faqs.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5" />
                  Frequently Asked Questions
                </h3>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {currentCategory.faqs.map((faq, index) => {
                    const isExpanded = expandedFaqs.has(`${currentCategory.id}-${index}`)
                    return (
                      <div key={index}>
                        <button
                          onClick={() => toggleFaq(currentCategory.id, index)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
                        >
                          <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-6 pb-4">
                            <p className="text-gray-600">{faq.answer}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Articles Section */}
            {currentCategory.articles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Book className="w-5 h-5" />
                  Help Articles
                </h3>
                <div className="space-y-4">
                  {currentCategory.articles.map((article, index) => {
                    const isExpanded = expandedArticles.has(`${currentCategory.id}-${index}`)
                    return (
                      <div key={index} className="bg-white rounded-lg border border-gray-200">
                        <button
                          onClick={() => toggleArticle(currentCategory.id, index)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
                        >
                          <div>
                            <h4 className="font-medium text-gray-900">{article.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{article.description}</p>
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {isExpanded && (
                          <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                            <div className="space-y-3">
                              {article.content.map((paragraph, pIdx) => (
                                <p key={pIdx} className="text-gray-600">
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact Support */}
        <div className="mt-12 bg-indigo-50 rounded-lg p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900">Still need help?</h3>
          <p className="text-gray-600 mt-2">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="mt-4 flex justify-center gap-4">
            <a
              href="mailto:support@buildflow.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

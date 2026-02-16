import { baseTemplate, replaceVariables } from './base'

export interface TaskDueReminderVars {
  recipientName: string
  taskTitle: string
  projectName: string
  dueDate: string
  daysUntilDue: number
  taskUrl: string
  companyName?: string
}

export function taskDueReminderTemplate(vars: TaskDueReminderVars): { html: string; text: string; subject: string } {
  const isOverdue = vars.daysUntilDue < 0
  const alertClass = isOverdue ? 'alert-danger' : vars.daysUntilDue <= 1 ? 'alert-warning' : 'alert-info'
  const urgencyText = isOverdue
    ? `This task is <strong>${Math.abs(vars.daysUntilDue)} day(s) overdue</strong>`
    : vars.daysUntilDue === 0
    ? 'This task is <strong>due today</strong>'
    : vars.daysUntilDue === 1
    ? 'This task is <strong>due tomorrow</strong>'
    : `This task is due in <strong>${vars.daysUntilDue} days</strong>`

  const content = `
    <h2>Task Due Reminder</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="${alertClass} alert">
      ${urgencyText}
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Task</span>
        <span class="detail-value">${vars.taskTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Due Date</span>
        <span class="detail-value">${vars.dueDate}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${vars.taskUrl}" class="btn">View Task</a>
    </p>
  `

  const subject = isOverdue
    ? `[Overdue] Task "${vars.taskTitle}" is ${Math.abs(vars.daysUntilDue)} day(s) overdue`
    : vars.daysUntilDue === 0
    ? `[Due Today] Task "${vars.taskTitle}"`
    : `[Reminder] Task "${vars.taskTitle}" is due ${vars.daysUntilDue === 1 ? 'tomorrow' : `in ${vars.daysUntilDue} days`}`

  const text = `
Hi ${vars.recipientName},

${isOverdue ? `Task "${vars.taskTitle}" is ${Math.abs(vars.daysUntilDue)} day(s) overdue!` : `Reminder: Task "${vars.taskTitle}" is due ${vars.daysUntilDue === 0 ? 'today' : vars.daysUntilDue === 1 ? 'tomorrow' : `in ${vars.daysUntilDue} days`}`}

Task: ${vars.taskTitle}
Project: ${vars.projectName}
Due Date: ${vars.dueDate}

View task: ${vars.taskUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject,
  }
}

export interface TaskAssignedVars {
  recipientName: string
  taskTitle: string
  projectName: string
  assignedBy: string
  dueDate?: string
  taskUrl: string
  companyName?: string
}

export function taskAssignedTemplate(vars: TaskAssignedVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>New Task Assigned</h2>
    <p>Hi ${vars.recipientName},</p>

    <p>${vars.assignedBy} has assigned you a new task.</p>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Task</span>
        <span class="detail-value">${vars.taskTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      ${vars.dueDate ? `
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Due Date</span>
        <span class="detail-value">${vars.dueDate}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${vars.taskUrl}" class="btn">View Task</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

${vars.assignedBy} has assigned you a new task.

Task: ${vars.taskTitle}
Project: ${vars.projectName}
${vars.dueDate ? `Due Date: ${vars.dueDate}` : ''}

View task: ${vars.taskUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[New Task] "${vars.taskTitle}" has been assigned to you`,
  }
}

export interface TaskEscalatedVars {
  recipientName: string
  taskTitle: string
  projectName: string
  escalatedBy: string
  reason?: string
  taskUrl: string
  companyName?: string
}

export function taskEscalatedTemplate(vars: TaskEscalatedVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>Task Escalated</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-danger">
      A task has been escalated and requires immediate attention.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Task</span>
        <span class="detail-value">${vars.taskTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Escalated By</span>
        <span class="detail-value">${vars.escalatedBy}</span>
      </div>
      ${vars.reason ? `
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Reason</span>
        <span class="detail-value">${vars.reason}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${vars.taskUrl}" class="btn btn-danger">View Escalated Task</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

TASK ESCALATED - Immediate attention required.

Task: ${vars.taskTitle}
Project: ${vars.projectName}
Escalated By: ${vars.escalatedBy}
${vars.reason ? `Reason: ${vars.reason}` : ''}

View task: ${vars.taskUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[URGENT] Task "${vars.taskTitle}" has been escalated`,
  }
}

export interface LowStockAlertVars {
  recipientName: string
  itemName: string
  projectName: string
  remainingQty: number
  minStockLevel: number
  unit: string
  inventoryUrl: string
  companyName?: string
}

export function lowStockAlertTemplate(vars: LowStockAlertVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>Low Stock Alert</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-warning">
      An inventory item is running low and may need to be restocked.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Item</span>
        <span class="detail-value">${vars.itemName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Remaining</span>
        <span class="detail-value" style="color: #dc2626;">${vars.remainingQty} ${vars.unit}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Min. Stock Level</span>
        <span class="detail-value">${vars.minStockLevel} ${vars.unit}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${vars.inventoryUrl}" class="btn btn-secondary">View Inventory</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

LOW STOCK ALERT

Item: ${vars.itemName}
Project: ${vars.projectName}
Remaining: ${vars.remainingQty} ${vars.unit}
Min. Stock Level: ${vars.minStockLevel} ${vars.unit}

View inventory: ${vars.inventoryUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[Low Stock] ${vars.itemName} is running low in ${vars.projectName}`,
  }
}

export interface TaskCompletedVars {
  recipientName: string
  taskTitle: string
  projectName: string
  completedBy: string
  taskUrl: string
  companyName?: string
}

export function taskCompletedTemplate(vars: TaskCompletedVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>Task Completed</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-success">
      A task has been marked as completed.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Task</span>
        <span class="detail-value">${vars.taskTitle}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Completed By</span>
        <span class="detail-value">${vars.completedBy}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${vars.taskUrl}" class="btn btn-success">View Task</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

A task has been completed.

Task: ${vars.taskTitle}
Project: ${vars.projectName}
Completed By: ${vars.completedBy}

View task: ${vars.taskUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[Completed] Task "${vars.taskTitle}"`,
  }
}

// ============= NEW LEAD NOTIFICATIONS =============

export interface NewLeadVars {
  recipientName: string
  leadName: string
  leadSource?: string
  leadValue?: string
  leadUrl: string
  companyName?: string
}

export function newLeadTemplate(vars: NewLeadVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>New Lead Received</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-info">
      A new lead has been added and requires your attention.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Lead Name</span>
        <span class="detail-value">${vars.leadName}</span>
      </div>
      ${vars.leadSource ? `
      <div class="detail-row">
        <span class="detail-label">Source</span>
        <span class="detail-value">${vars.leadSource}</span>
      </div>
      ` : ''}
      ${vars.leadValue ? `
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Est. Value</span>
        <span class="detail-value">${vars.leadValue}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${vars.leadUrl}" class="btn">View Lead</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

A new lead has been added.

Lead Name: ${vars.leadName}
${vars.leadSource ? `Source: ${vars.leadSource}` : ''}
${vars.leadValue ? `Est. Value: ${vars.leadValue}` : ''}

View lead: ${vars.leadUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[New Lead] ${vars.leadName}`,
  }
}

// ============= BID NOTIFICATIONS =============

export interface BidReceivedVars {
  recipientName: string
  bidderName: string
  projectName: string
  bidAmount: string
  bidUrl: string
  companyName?: string
}

export function bidReceivedTemplate(vars: BidReceivedVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>New Bid Received</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-success">
      A new bid has been submitted for your procurement request.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Bidder</span>
        <span class="detail-value">${vars.bidderName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Bid Amount</span>
        <span class="detail-value" style="font-weight: bold;">${vars.bidAmount}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${vars.bidUrl}" class="btn">Review Bid</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

A new bid has been submitted.

Bidder: ${vars.bidderName}
Project: ${vars.projectName}
Bid Amount: ${vars.bidAmount}

Review bid: ${vars.bidUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[New Bid] ${vars.bidderName} submitted a bid for ${vars.projectName}`,
  }
}

export interface BidStatusChangeVars {
  recipientName: string
  projectName: string
  bidAmount: string
  oldStatus: string
  newStatus: string
  bidUrl: string
  companyName?: string
}

export function bidStatusChangeTemplate(vars: BidStatusChangeVars): { html: string; text: string; subject: string } {
  const statusClass = vars.newStatus === 'ACCEPTED' ? 'alert-success' : vars.newStatus === 'REJECTED' ? 'alert-danger' : 'alert-info'

  const content = `
    <h2>Bid Status Updated</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="${statusClass} alert">
      Your bid status has been updated to: <strong>${vars.newStatus}</strong>
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Bid Amount</span>
        <span class="detail-value">${vars.bidAmount}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Status</span>
        <span class="detail-value">${vars.oldStatus} → <strong>${vars.newStatus}</strong></span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${vars.bidUrl}" class="btn">View Details</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

Your bid status has been updated.

Project: ${vars.projectName}
Bid Amount: ${vars.bidAmount}
Status: ${vars.oldStatus} → ${vars.newStatus}

View details: ${vars.bidUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[Bid Update] Your bid for ${vars.projectName} is now ${vars.newStatus}`,
  }
}

// ============= PURCHASE ORDER NOTIFICATIONS =============

export interface POApprovedVars {
  recipientName: string
  poNumber: string
  vendorName: string
  totalAmount: string
  approvedBy: string
  poUrl: string
  companyName?: string
}

export function poApprovedTemplate(vars: POApprovedVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>Purchase Order Approved</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-success">
      A purchase order has been approved.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">PO Number</span>
        <span class="detail-value">${vars.poNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Vendor</span>
        <span class="detail-value">${vars.vendorName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value" style="font-weight: bold;">${vars.totalAmount}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Approved By</span>
        <span class="detail-value">${vars.approvedBy}</span>
      </div>
    </div>

    <p style="text-align: center;">
      <a href="${vars.poUrl}" class="btn btn-success">View Purchase Order</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

A purchase order has been approved.

PO Number: ${vars.poNumber}
Vendor: ${vars.vendorName}
Amount: ${vars.totalAmount}
Approved By: ${vars.approvedBy}

View PO: ${vars.poUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[PO Approved] ${vars.poNumber} - ${vars.vendorName}`,
  }
}

export interface POSentToVendorVars {
  recipientName: string
  poNumber: string
  projectName: string
  totalAmount: string
  items: string[]
  poUrl: string
  companyName?: string
}

export function poSentToVendorTemplate(vars: POSentToVendorVars): { html: string; text: string; subject: string } {
  const itemsList = vars.items.slice(0, 5).map(item => `<li>${item}</li>`).join('')
  const moreItems = vars.items.length > 5 ? `<li>... and ${vars.items.length - 5} more items</li>` : ''

  const content = `
    <h2>New Purchase Order</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-info">
      You have received a new purchase order.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">PO Number</span>
        <span class="detail-value">${vars.poNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Total Amount</span>
        <span class="detail-value" style="font-weight: bold;">${vars.totalAmount}</span>
      </div>
    </div>

    <div style="margin: 16px 0;">
      <strong>Items:</strong>
      <ul style="margin: 8px 0; padding-left: 20px;">
        ${itemsList}
        ${moreItems}
      </ul>
    </div>

    <p style="text-align: center;">
      <a href="${vars.poUrl}" class="btn">View Purchase Order</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

You have received a new purchase order.

PO Number: ${vars.poNumber}
Project: ${vars.projectName}
Total Amount: ${vars.totalAmount}

View PO: ${vars.poUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[New PO] Purchase Order ${vars.poNumber}`,
  }
}

// ============= PAYMENT NOTIFICATIONS =============

export interface PaymentRecordedVars {
  recipientName: string
  paymentAmount: string
  projectName: string
  paymentType: string
  reference?: string
  paymentUrl: string
  companyName?: string
}

export function paymentRecordedTemplate(vars: PaymentRecordedVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>Payment Recorded</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="alert alert-success">
      A payment has been recorded.
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Amount</span>
        <span class="detail-value" style="font-weight: bold; color: #059669;">${vars.paymentAmount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Type</span>
        <span class="detail-value">${vars.paymentType}</span>
      </div>
      ${vars.reference ? `
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Reference</span>
        <span class="detail-value">${vars.reference}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${vars.paymentUrl}" class="btn btn-success">View Details</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

A payment has been recorded.

Amount: ${vars.paymentAmount}
Project: ${vars.projectName}
Type: ${vars.paymentType}
${vars.reference ? `Reference: ${vars.reference}` : ''}

View details: ${vars.paymentUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[Payment] ${vars.paymentAmount} recorded for ${vars.projectName}`,
  }
}

// ============= CONTRACT NOTIFICATIONS =============

export interface ContractChangeVars {
  recipientName: string
  contractTitle: string
  vendorName: string
  changeType: 'created' | 'updated' | 'expiring'
  expiryDate?: string
  contractUrl: string
  companyName?: string
}

export function contractChangeTemplate(vars: ContractChangeVars): { html: string; text: string; subject: string } {
  const alertClass = vars.changeType === 'expiring' ? 'alert-warning' : 'alert-info'
  const alertMessage = vars.changeType === 'created'
    ? 'A new contract has been created.'
    : vars.changeType === 'updated'
    ? 'A contract has been updated.'
    : `Contract is expiring soon${vars.expiryDate ? ` (${vars.expiryDate})` : ''}.`

  const content = `
    <h2>Contract ${vars.changeType.charAt(0).toUpperCase() + vars.changeType.slice(1)}</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="${alertClass} alert">
      ${alertMessage}
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Contract</span>
        <span class="detail-value">${vars.contractTitle}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Vendor</span>
        <span class="detail-value">${vars.vendorName}</span>
      </div>
      ${vars.expiryDate ? `
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Expires</span>
        <span class="detail-value">${vars.expiryDate}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${vars.contractUrl}" class="btn">View Contract</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

${alertMessage}

Contract: ${vars.contractTitle}
Vendor: ${vars.vendorName}
${vars.expiryDate ? `Expires: ${vars.expiryDate}` : ''}

View contract: ${vars.contractUrl}
`

  const subjectPrefix = vars.changeType === 'expiring' ? '[Contract Expiring]' : vars.changeType === 'created' ? '[New Contract]' : '[Contract Updated]'

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `${subjectPrefix} ${vars.contractTitle}`,
  }
}

// ============= MILESTONE NOTIFICATIONS =============

export interface MilestoneVars {
  recipientName: string
  milestoneName: string
  projectName: string
  dueDate?: string
  status: 'completed' | 'due_soon' | 'overdue'
  milestoneUrl: string
  companyName?: string
}

export function milestoneTemplate(vars: MilestoneVars): { html: string; text: string; subject: string } {
  const alertClass = vars.status === 'completed' ? 'alert-success' : vars.status === 'overdue' ? 'alert-danger' : 'alert-warning'
  const alertMessage = vars.status === 'completed'
    ? 'A milestone has been completed!'
    : vars.status === 'overdue'
    ? 'A milestone is overdue and requires attention.'
    : `A milestone is due soon${vars.dueDate ? ` (${vars.dueDate})` : ''}.`

  const content = `
    <h2>Milestone ${vars.status === 'completed' ? 'Completed' : vars.status === 'overdue' ? 'Overdue' : 'Due Soon'}</h2>
    <p>Hi ${vars.recipientName},</p>

    <div class="${alertClass} alert">
      ${alertMessage}
    </div>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Milestone</span>
        <span class="detail-value">${vars.milestoneName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      ${vars.dueDate ? `
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Due Date</span>
        <span class="detail-value">${vars.dueDate}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${vars.milestoneUrl}" class="btn">View Milestone</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

${alertMessage}

Milestone: ${vars.milestoneName}
Project: ${vars.projectName}
${vars.dueDate ? `Due Date: ${vars.dueDate}` : ''}

View milestone: ${vars.milestoneUrl}
`

  const subjectPrefix = vars.status === 'completed' ? '[Milestone Completed]' : vars.status === 'overdue' ? '[Milestone Overdue]' : '[Milestone Due Soon]'

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `${subjectPrefix} ${vars.milestoneName} - ${vars.projectName}`,
  }
}

// ============= MENTION NOTIFICATIONS =============

export interface MentionVars {
  recipientName: string
  mentionedBy: string
  context: string
  commentPreview: string
  contextUrl: string
  companyName?: string
}

export function mentionTemplate(vars: MentionVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>You Were Mentioned</h2>
    <p>Hi ${vars.recipientName},</p>

    <p><strong>${vars.mentionedBy}</strong> mentioned you in a comment:</p>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0; border-left: 4px solid #6366f1;">
      <p style="margin: 0; color: #374151;">"${vars.commentPreview}"</p>
    </div>

    <p style="font-size: 14px; color: #6b7280;">In: ${vars.context}</p>

    <p style="text-align: center;">
      <a href="${vars.contextUrl}" class="btn">View Comment</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

${vars.mentionedBy} mentioned you in a comment:

"${vars.commentPreview}"

In: ${vars.context}

View comment: ${vars.contextUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[Mention] ${vars.mentionedBy} mentioned you`,
  }
}

// ============= DOCUMENT SHARING NOTIFICATIONS =============

export interface DocumentSharedVars {
  recipientName: string
  documentName: string
  sharedBy: string
  projectName?: string
  documentUrl: string
  companyName?: string
}

export function documentSharedTemplate(vars: DocumentSharedVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>Document Shared With You</h2>
    <p>Hi ${vars.recipientName},</p>

    <p><strong>${vars.sharedBy}</strong> has shared a document with you.</p>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Document</span>
        <span class="detail-value">${vars.documentName}</span>
      </div>
      ${vars.projectName ? `
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Project</span>
        <span class="detail-value">${vars.projectName}</span>
      </div>
      ` : ''}
    </div>

    <p style="text-align: center;">
      <a href="${vars.documentUrl}" class="btn">View Document</a>
    </p>
  `

  const text = `
Hi ${vars.recipientName},

${vars.sharedBy} has shared a document with you.

Document: ${vars.documentName}
${vars.projectName ? `Project: ${vars.projectName}` : ''}

View document: ${vars.documentUrl}
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `[Document] ${vars.sharedBy} shared "${vars.documentName}" with you`,
  }
}

// ============= TEAM INVITE NOTIFICATIONS =============

export interface TeamInviteVars {
  recipientName: string
  recipientEmail: string
  invitedBy: string
  role: string
  inviteUrl: string
  expiresAt: string
  companyName?: string
}

export function teamInviteTemplate(vars: TeamInviteVars): { html: string; text: string; subject: string } {
  const content = `
    <h2>You're Invited to Join ${vars.companyName || 'BuildFlow'}</h2>
    <p>Hi ${vars.recipientName},</p>

    <p><strong>${vars.invitedBy}</strong> has invited you to join their team on ${vars.companyName || 'BuildFlow'}.</p>

    <div style="background-color: #f9fafb; padding: 16px; border-radius: 6px; margin: 16px 0;">
      <div class="detail-row">
        <span class="detail-label">Role</span>
        <span class="detail-value">${vars.role}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Email</span>
        <span class="detail-value">${vars.recipientEmail}</span>
      </div>
      <div class="detail-row" style="border-bottom: none;">
        <span class="detail-label">Expires</span>
        <span class="detail-value">${vars.expiresAt}</span>
      </div>
    </div>

    <p style="text-align: center; margin: 24px 0;">
      <a href="${vars.inviteUrl}" class="btn" style="font-size: 16px; padding: 14px 32px;">Accept Invitation</a>
    </p>

    <p style="color: #6b7280; font-size: 14px;">
      This invitation link will expire on ${vars.expiresAt}. If you did not expect this invitation, you can safely ignore this email.
    </p>
  `

  const text = `
Hi ${vars.recipientName},

${vars.invitedBy} has invited you to join their team on ${vars.companyName || 'BuildFlow'}.

Role: ${vars.role}
Email: ${vars.recipientEmail}

Accept your invitation: ${vars.inviteUrl}

This invitation link will expire on ${vars.expiresAt}. If you did not expect this invitation, you can safely ignore this email.
`

  return {
    html: baseTemplate(content, vars.companyName),
    text: text.trim(),
    subject: `You're invited to join ${vars.companyName || 'BuildFlow'}`,
  }
}

/**
 * SMS Notification Templates
 *
 * SMS messages should be concise (160 characters for single SMS).
 * Longer messages will be split into multiple SMS parts.
 *
 * Format: [CompanyName] Message content
 */

export interface SMSTemplateVars {
  companyName: string
  recipientName?: string
  taskTitle?: string
  projectName?: string
  vendorName?: string
  daysUntilDue?: number
  dueDate?: string
  assignedBy?: string
  escalatedBy?: string
  escalationReason?: string
  completedBy?: string
  itemName?: string
  remainingQty?: number
  minStockLevel?: number
  unit?: string
  poNumber?: string
  total?: string
  amount?: string
  contractName?: string
  milestoneTitle?: string
  documentName?: string
  mentionedBy?: string
}

/**
 * Truncate text to fit SMS length constraints
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Task Due Reminder SMS
 * Used for: task_due_soon, task_due_today, task_overdue
 */
export function taskDueReminderSMS(vars: SMSTemplateVars): string {
  const task = truncate(vars.taskTitle || 'Task', 30)
  const days = vars.daysUntilDue ?? 0

  if (days < 0) {
    const overdueDays = Math.abs(days)
    return `[${vars.companyName}] OVERDUE: "${task}" is ${overdueDays}d overdue. Please take action.`
  } else if (days === 0) {
    return `[${vars.companyName}] DUE TODAY: "${task}" is due today. Please complete it.`
  } else if (days === 1) {
    return `[${vars.companyName}] DUE TOMORROW: "${task}" is due tomorrow.`
  } else {
    return `[${vars.companyName}] Reminder: "${task}" is due in ${days} days.`
  }
}

/**
 * Task Assigned SMS
 */
export function taskAssignedSMS(vars: SMSTemplateVars): string {
  const task = truncate(vars.taskTitle || 'Task', 25)
  const project = truncate(vars.projectName || 'Project', 20)

  return `[${vars.companyName}] New task assigned: "${task}" in ${project}.`
}

/**
 * Task Escalated SMS
 */
export function taskEscalatedSMS(vars: SMSTemplateVars): string {
  const task = truncate(vars.taskTitle || 'Task', 30)

  return `[${vars.companyName}] URGENT: Task "${task}" has been escalated. Immediate action required.`
}

/**
 * Task Completed SMS
 */
export function taskCompletedSMS(vars: SMSTemplateVars): string {
  const task = truncate(vars.taskTitle || 'Task', 25)
  const completedBy = truncate(vars.completedBy || 'Someone', 15)

  return `[${vars.companyName}] Task "${task}" completed by ${completedBy}.`
}

/**
 * Low Stock Alert SMS
 */
export function lowStockAlertSMS(vars: SMSTemplateVars): string {
  const item = truncate(vars.itemName || 'Item', 20)
  const project = truncate(vars.projectName || 'Project', 15)
  const remaining = vars.remainingQty ?? 0
  const unit = vars.unit || 'units'

  return `[${vars.companyName}] Low Stock: ${item} in ${project}. ${remaining} ${unit} remaining (min: ${vars.minStockLevel}).`
}

/**
 * New Lead SMS
 */
export function newLeadSMS(vars: SMSTemplateVars): string {
  const project = truncate(vars.projectName || 'New Lead', 30)

  return `[${vars.companyName}] New lead received: "${project}". Review and follow up.`
}

/**
 * Bid Received SMS
 */
export function bidReceivedSMS(vars: SMSTemplateVars): string {
  const vendor = truncate(vars.vendorName || 'Vendor', 20)
  const project = truncate(vars.projectName || 'Project', 20)

  return `[${vars.companyName}] New bid from ${vendor} for "${project}". Review now.`
}

/**
 * Bid Status Change SMS
 */
export function bidStatusChangeSMS(vars: SMSTemplateVars & { status: string }): string {
  const project = truncate(vars.projectName || 'Project', 25)

  return `[${vars.companyName}] Bid for "${project}" has been ${vars.status}.`
}

/**
 * Purchase Order Approved SMS
 */
export function poApprovedSMS(vars: SMSTemplateVars): string {
  const vendor = truncate(vars.vendorName || 'Vendor', 20)
  const total = vars.total || 'N/A'

  return `[${vars.companyName}] PO #${vars.poNumber} approved for ${vendor}. Total: ${total}.`
}

/**
 * Purchase Order Sent to Vendor SMS
 */
export function poSentToVendorSMS(vars: SMSTemplateVars): string {
  const total = vars.total || 'N/A'

  return `[${vars.companyName}] PO #${vars.poNumber} received. Total: ${total}. Please review and confirm.`
}

/**
 * Contract Created/Updated SMS
 */
export function contractChangeSMS(vars: SMSTemplateVars & { action: 'created' | 'updated' | 'expiring' }): string {
  const contract = truncate(vars.contractName || 'Contract', 25)

  if (vars.action === 'expiring') {
    return `[${vars.companyName}] Contract "${contract}" is expiring soon. Please review.`
  }

  return `[${vars.companyName}] Contract "${contract}" has been ${vars.action}.`
}

/**
 * Payment Recorded SMS
 */
export function paymentRecordedSMS(vars: SMSTemplateVars): string {
  const amount = vars.amount || 'N/A'
  const contract = truncate(vars.contractName || 'Contract', 20)

  return `[${vars.companyName}] Payment of ${amount} recorded for ${contract}.`
}

/**
 * Payment Received (Vendor) SMS
 */
export function paymentReceivedVendorSMS(vars: SMSTemplateVars): string {
  const amount = vars.amount || 'N/A'

  return `[${vars.companyName}] Payment received: ${amount}. Thank you for your service.`
}

/**
 * Milestone Completed SMS
 */
export function milestoneCompletedSMS(vars: SMSTemplateVars): string {
  const milestone = truncate(vars.milestoneTitle || 'Milestone', 25)
  const project = truncate(vars.projectName || 'Project', 20)

  return `[${vars.companyName}] Milestone "${milestone}" completed in ${project}!`
}

/**
 * Milestone Due Soon SMS
 */
export function milestoneDueSoonSMS(vars: SMSTemplateVars): string {
  const milestone = truncate(vars.milestoneTitle || 'Milestone', 25)
  const days = vars.daysUntilDue ?? 0

  if (days === 0) {
    return `[${vars.companyName}] Milestone "${milestone}" is due today!`
  }
  return `[${vars.companyName}] Milestone "${milestone}" is due in ${days} day(s).`
}

/**
 * Document Shared SMS
 */
export function documentSharedSMS(vars: SMSTemplateVars): string {
  const doc = truncate(vars.documentName || 'Document', 25)
  const project = truncate(vars.projectName || 'Project', 15)

  return `[${vars.companyName}] Document "${doc}" shared in ${project}. Please review.`
}

/**
 * Mention in Comment SMS
 */
export function mentionSMS(vars: SMSTemplateVars): string {
  const mentionedBy = truncate(vars.mentionedBy || 'Someone', 15)
  const task = truncate(vars.taskTitle || 'a task', 20)

  return `[${vars.companyName}] ${mentionedBy} mentioned you in ${task}. Check the app for details.`
}

/**
 * Asset Request Approved SMS
 */
export function assetRequestApprovedSMS(vars: SMSTemplateVars & { assetName: string }): string {
  const asset = truncate(vars.assetName, 25)

  return `[${vars.companyName}] Asset request approved: "${asset}". You can now pick it up.`
}

/**
 * Asset Request Rejected SMS
 */
export function assetRequestRejectedSMS(vars: SMSTemplateVars & { assetName: string; reason?: string }): string {
  const asset = truncate(vars.assetName, 25)

  if (vars.reason) {
    const reason = truncate(vars.reason, 30)
    return `[${vars.companyName}] Asset request for "${asset}" rejected: ${reason}`
  }
  return `[${vars.companyName}] Asset request for "${asset}" has been rejected.`
}

/**
 * Vendor Task Assignment SMS (for vendor portal)
 */
export function vendorTaskAssignedSMS(vars: SMSTemplateVars): string {
  const task = truncate(vars.taskTitle || 'Task', 25)
  const project = truncate(vars.projectName || 'Project', 20)

  return `[${vars.companyName}] New task: "${task}" assigned to you in ${project}. Login to view.`
}

/**
 * Generic notification SMS
 */
export function genericNotificationSMS(vars: { companyName: string; message: string }): string {
  const message = truncate(vars.message, 140 - vars.companyName.length - 3)
  return `[${vars.companyName}] ${message}`
}

/**
 * Get SMS template by notification type
 */
export function getSMSTemplate(
  type: string,
  vars: SMSTemplateVars & Record<string, unknown>
): string {
  switch (type) {
    case 'task_due_soon':
    case 'task_due_today':
    case 'task_overdue':
    case 'TASK_DUE_REMINDER':
      return taskDueReminderSMS(vars)

    case 'task_assigned':
      return taskAssignedSMS(vars)

    case 'task_escalated':
      return taskEscalatedSMS(vars)

    case 'task_completed':
      return taskCompletedSMS(vars)

    case 'LOW_STOCK_ALERT':
      return lowStockAlertSMS(vars)

    case 'new_lead':
      return newLeadSMS(vars)

    case 'bid_received':
      return bidReceivedSMS(vars)

    case 'bid_status_change':
      return bidStatusChangeSMS({ ...vars, status: vars.status as string || 'updated' })

    case 'po_approved':
      return poApprovedSMS(vars)

    case 'po_sent_to_vendor':
      return poSentToVendorSMS(vars)

    case 'contract_created':
      return contractChangeSMS({ ...vars, action: 'created' })

    case 'contract_updated':
      return contractChangeSMS({ ...vars, action: 'updated' })

    case 'contract_expiring':
      return contractChangeSMS({ ...vars, action: 'expiring' })

    case 'payment_recorded':
      return paymentRecordedSMS(vars)

    case 'payment_received_vendor':
      return paymentReceivedVendorSMS(vars)

    case 'milestone_completed':
      return milestoneCompletedSMS(vars)

    case 'milestone_due_soon':
      return milestoneDueSoonSMS(vars)

    case 'document_shared':
      return documentSharedSMS(vars)

    case 'mention_in_comment':
    case 'mention_in_vendor_comment':
      return mentionSMS(vars)

    case 'asset_request_approved':
      return assetRequestApprovedSMS({ ...vars, assetName: vars.assetName as string || 'Asset' })

    case 'asset_request_rejected':
      return assetRequestRejectedSMS({
        ...vars,
        assetName: vars.assetName as string || 'Asset',
        reason: vars.reason as string | undefined,
      })

    case 'vendor_task_assigned':
      return vendorTaskAssignedSMS(vars)

    case 'team_invite':
      return teamInviteSMS(vars)

    default:
      return genericNotificationSMS({
        companyName: vars.companyName,
        message: vars.message as string || 'You have a new notification.',
      })
  }
}

/**
 * Team Invite SMS
 */
export function teamInviteSMS(vars: SMSTemplateVars & { inviteUrl?: string }): string {
  return `[${vars.companyName}] You've been invited to join the team! Check your email for the invitation link.`
}

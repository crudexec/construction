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

export interface ReviewOption { value: string; label: string }
export interface ReviewField {
  key: string
  label: string
  type: 'text' | 'email' | 'number' | 'datetime-local' | 'select' | 'checkbox'
  required?: boolean
  options?: ReviewOption[]
  choiceKey?: string
  initial: string
  hint?: string
}
export interface ReviewRow {
  id: string
  position: number
  sourceFile: string
  sourceRow: number
  sourceId: string | null
  kind: string
  title: string
  reason: string
  context: { label: string; value: string }[]
  fields: ReviewField[]
  decision: 'resolve' | 'exclude' | 'question' | null
  values: Record<string, string>
  notes: string
  reviewer: string | null
  revision: number
  updatedAt: string
}
export interface ReviewWorkspace {
  id: string
  title: string
  companyName: string
  expiresAt: string
  submittedAt: string | null
  submittedBy: string | null
  revision: number
  choices: Record<string, ReviewOption[]>
  rows: ReviewRow[]
}
export const KIND_LABELS: Record<string, string> = {
  contact: 'Contacts', assignment: 'Assignments', issue: 'Issues',
  line_item: 'Work-order details', service: 'Service entries', part: 'Parts',
}

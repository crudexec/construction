import { TemplateVariable, VariableCategory, DocumentTemplateType } from './types'

// ============================================================================
// CHANGE ORDER VARIABLES
// ============================================================================

const CHANGE_ORDER_VARIABLES: TemplateVariable[] = [
  {
    key: '{{changeOrder.number}}',
    label: 'Change Order Number',
    description: 'The formatted change order number (e.g., CO-001-1)',
    example: 'CO-CON-2026-001-1',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.title}}',
    label: 'Title',
    description: 'The title of the change order',
    example: 'Additional Electrical Work',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.description}}',
    label: 'Description',
    description: 'Full description of the change order',
    example: 'Installation of additional outlets in conference room',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.reason}}',
    label: 'Reason',
    description: 'Justification for the change order',
    example: 'Client requested additional power outlets',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.totalAmount}}',
    label: 'Total Amount',
    description: 'Total value of the change order (formatted with currency)',
    example: '$5,000.00',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.status}}',
    label: 'Status',
    description: 'Current status of the change order',
    example: 'APPROVED',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.createdDate}}',
    label: 'Created Date',
    description: 'Date the change order was created',
    example: 'March 6, 2026',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.submittedDate}}',
    label: 'Submitted Date',
    description: 'Date the change order was submitted for approval',
    example: 'March 6, 2026',
    category: 'Change Order',
  },
  {
    key: '{{changeOrder.approvedDate}}',
    label: 'Approved Date',
    description: 'Date the change order was approved',
    example: 'March 7, 2026',
    category: 'Change Order',
  },
]

const CONTRACT_VARIABLES: TemplateVariable[] = [
  {
    key: '{{contract.number}}',
    label: 'Contract Number',
    description: 'The contract number this change order belongs to',
    example: 'CON-2026-001',
    category: 'Contract',
  },
  {
    key: '{{contract.totalSum}}',
    label: 'Contract Total',
    description: 'Total value of the original contract',
    example: '$150,000.00',
    category: 'Contract',
  },
  {
    key: '{{contract.type}}',
    label: 'Contract Type',
    description: 'Type of contract (Lump Sum, Remeasurable, etc.)',
    example: 'Lump Sum',
    category: 'Contract',
  },
]

const VENDOR_VARIABLES: TemplateVariable[] = [
  {
    key: '{{vendor.name}}',
    label: 'Contact Name',
    description: 'Primary contact name at the vendor',
    example: 'John Smith',
    category: 'Vendor',
  },
  {
    key: '{{vendor.companyName}}',
    label: 'Company Name',
    description: 'Vendor company name',
    example: 'ABC Construction LLC',
    category: 'Vendor',
  },
  {
    key: '{{vendor.email}}',
    label: 'Email',
    description: 'Vendor email address',
    example: 'contact@abcconstruction.com',
    category: 'Vendor',
  },
  {
    key: '{{vendor.phone}}',
    label: 'Phone',
    description: 'Vendor phone number',
    example: '(555) 123-4567',
    category: 'Vendor',
  },
  {
    key: '{{vendor.address}}',
    label: 'Address',
    description: 'Vendor street address',
    example: '123 Main Street',
    category: 'Vendor',
  },
  {
    key: '{{vendor.cityStateZip}}',
    label: 'City, State ZIP',
    description: 'Vendor city, state, and ZIP code',
    example: 'Austin, TX 78701',
    category: 'Vendor',
  },
  {
    key: '{{vendor.licenseNumber}}',
    label: 'License Number',
    description: 'Vendor license number',
    example: 'LIC-12345',
    category: 'Vendor',
  },
]

const COMPANY_VARIABLES: TemplateVariable[] = [
  {
    key: '{{company.name}}',
    label: 'Company Name',
    description: 'Your company name',
    example: 'Your Construction Company',
    category: 'Company',
  },
  {
    key: '{{company.address}}',
    label: 'Address',
    description: 'Your company street address',
    example: '456 Business Avenue',
    category: 'Company',
  },
  {
    key: '{{company.cityStateZip}}',
    label: 'City, State ZIP',
    description: 'Your company city, state, and ZIP code',
    example: 'Houston, TX 77001',
    category: 'Company',
  },
  {
    key: '{{company.phone}}',
    label: 'Phone',
    description: 'Your company phone number',
    example: '(555) 987-6543',
    category: 'Company',
  },
  {
    key: '{{company.email}}',
    label: 'Email',
    description: 'Your company email address',
    example: 'info@yourcompany.com',
    category: 'Company',
  },
]

const PEOPLE_VARIABLES: TemplateVariable[] = [
  {
    key: '{{createdBy.name}}',
    label: 'Created By',
    description: 'Name of the person who created the change order',
    example: 'John Smith',
    category: 'People',
  },
  {
    key: '{{approvedBy.name}}',
    label: 'Approved By',
    description: 'Name of the person who approved the change order',
    example: 'Jane Doe',
    category: 'People',
  },
]

const TABLE_VARIABLES: TemplateVariable[] = [
  {
    key: '{{lineItems.table}}',
    label: 'Line Items Table',
    description: 'Auto-generated table of all line items with columns: Description, Qty, Unit, Unit Price, Total',
    example: '[Table with line items]',
    category: 'Tables',
  },
]

const DATE_VARIABLES: TemplateVariable[] = [
  {
    key: '{{today}}',
    label: 'Today\'s Date',
    description: 'Current date when document is generated',
    example: 'March 6, 2026',
    category: 'Dates',
  },
  {
    key: '{{currentYear}}',
    label: 'Current Year',
    description: 'Current year when document is generated',
    example: '2026',
    category: 'Dates',
  },
]

// ============================================================================
// VARIABLE CATEGORIES BY DOCUMENT TYPE
// ============================================================================

export const CHANGE_ORDER_VARIABLE_CATEGORIES: VariableCategory[] = [
  { name: 'Change Order', variables: CHANGE_ORDER_VARIABLES },
  { name: 'Contract', variables: CONTRACT_VARIABLES },
  { name: 'Vendor', variables: VENDOR_VARIABLES },
  { name: 'Company', variables: COMPANY_VARIABLES },
  { name: 'People', variables: PEOPLE_VARIABLES },
  { name: 'Tables', variables: TABLE_VARIABLES },
  { name: 'Dates', variables: DATE_VARIABLES },
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all variables for a document type
 */
export function getVariablesForType(type: DocumentTemplateType): VariableCategory[] {
  switch (type) {
    case 'CHANGE_ORDER':
      return CHANGE_ORDER_VARIABLE_CATEGORIES
    // Future: Add other document types here
    default:
      return CHANGE_ORDER_VARIABLE_CATEGORIES
  }
}

/**
 * Get a flat list of all variable keys for a document type
 */
export function getVariableKeys(type: DocumentTemplateType): string[] {
  const categories = getVariablesForType(type)
  return categories.flatMap(cat => cat.variables.map(v => v.key))
}

/**
 * Find a variable by its key
 */
export function findVariable(key: string, type: DocumentTemplateType): TemplateVariable | undefined {
  const categories = getVariablesForType(type)
  for (const category of categories) {
    const variable = category.variables.find(v => v.key === key)
    if (variable) return variable
  }
  return undefined
}

/**
 * Extract all variable keys from template content
 */
export function extractVariables(content: string): string[] {
  const regex = /\{\{[a-zA-Z0-9_.]+\}\}/g
  const matches = content.match(regex)
  return matches ? [...new Set(matches)] : []
}

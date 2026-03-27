import { DocumentTemplateType } from '@prisma/client'

// Re-export the enum for convenience
export { DocumentTemplateType }

// ============================================================================
// TEMPLATE INTERFACES
// ============================================================================

export interface DocumentTemplate {
  id: string
  companyId: string
  name: string
  description: string | null
  type: DocumentTemplateType
  content: string
  isDefault: boolean
  isActive: boolean
  createdById: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateTemplateInput {
  name: string
  description?: string
  type: DocumentTemplateType
  content: string
  isDefault?: boolean
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  content?: string
  isDefault?: boolean
  isActive?: boolean
}

// ============================================================================
// VARIABLE SYSTEM
// ============================================================================

export interface TemplateVariable {
  key: string           // e.g., "{{changeOrder.title}}"
  label: string         // e.g., "Change Order Title"
  description: string   // e.g., "The title of the change order"
  example: string       // e.g., "Additional Electrical Work"
  category: string      // e.g., "Change Order"
}

export interface VariableCategory {
  name: string
  variables: TemplateVariable[]
}

// ============================================================================
// DOCUMENT GENERATION
// ============================================================================

export interface GenerateDocumentInput {
  templateId: string
  recordType: 'change-order' | 'purchase-order' | 'vendor-contract' | 'estimate' | 'bid'
  recordId: string
  options?: GenerateDocumentOptions
}

export interface GenerateDocumentOptions {
  format?: 'letter' | 'a4'
  includeSignatureLines?: boolean
}

export interface GeneratedDocument {
  html: string          // Rendered HTML with substituted variables
  filename: string      // Suggested filename
  vendorId?: string     // Vendor ID for auto-saving to vendor files
}

// ============================================================================
// DATA FETCHER TYPES
// ============================================================================

export interface ChangeOrderData {
  vendorId: string      // For auto-saving generated documents
  changeOrder: {
    number: string
    title: string
    description: string | null
    reason: string | null
    totalAmount: number
    status: string
    createdDate: string
    submittedDate: string | null
    approvedDate: string | null
  }
  contract: {
    number: string
    totalSum: number
    type: string
  }
  vendor: {
    name: string
    companyName: string
    email: string | null
    phone: string | null
    address: string | null
    cityStateZip: string
    licenseNumber: string | null
  }
  company: {
    name: string
    logo: string | null
    address: string | null
    cityStateZip: string
    phone: string | null
    email: string | null
  }
  createdBy: {
    name: string
  }
  approvedBy: {
    name: string
  } | null
  lineItems: Array<{
    description: string
    quantity: number
    unit: string
    unitPrice: number
    totalPrice: number
    notes: string | null
  }>
  today: string
  currentYear: string
}

// Mapping of variable keys to their resolved values
export type VariableResolver = Record<string, string | undefined>

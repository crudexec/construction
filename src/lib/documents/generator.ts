import { prisma } from '@/lib/prisma'
import {
  DocumentTemplateType,
  GenerateDocumentInput,
  GeneratedDocument,
  VariableResolver,
} from './types'
import {
  fetchChangeOrderData,
  changeOrderToVariables,
} from './data-fetchers/change-order'
import {
  fetchLienReleaseData,
  lienReleaseToVariables,
} from './data-fetchers/lien-release'

/**
 * Document Generator Service
 * Handles template fetching, variable substitution, and document generation
 */
export class DocumentGenerator {
  private companyId: string
  private currency: string

  constructor(companyId: string, currency: string = 'USD') {
    this.companyId = companyId
    this.currency = currency
  }

  /**
   * Generate a document from a template and record
   */
  async generate(input: GenerateDocumentInput): Promise<GeneratedDocument> {
    // Fetch the template
    const template = await prisma.documentTemplate.findFirst({
      where: {
        id: input.templateId,
        companyId: this.companyId,
        isActive: true,
      },
    })

    if (!template) {
      throw new Error('Template not found or inactive')
    }

    // Fetch record data and get variable resolver + vendorId
    const { variables, vendorId } = await this.getVariables(input.recordType, input.recordId)

    // Substitute variables in template content
    const html = this.substituteVariables(template.content, variables)

    // Generate filename
    const filename = this.generateFilename(input.recordType, variables)

    return { html, filename, vendorId }
  }

  /**
   * Get the default template for a document type
   */
  async getDefaultTemplate(type: DocumentTemplateType) {
    return prisma.documentTemplate.findFirst({
      where: {
        companyId: this.companyId,
        type,
        isDefault: true,
        isActive: true,
      },
    })
  }

  /**
   * Get templates available for a document type
   */
  async getTemplatesForType(type: DocumentTemplateType) {
    return prisma.documentTemplate.findMany({
      where: {
        companyId: this.companyId,
        type,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isDefault: true,
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    })
  }

  /**
   * Fetch data and create variable resolver based on record type
   * Returns both the variables and vendorId for auto-saving
   */
  private async getVariables(
    recordType: GenerateDocumentInput['recordType'],
    recordId: string
  ): Promise<{ variables: VariableResolver; vendorId?: string }> {
    switch (recordType) {
      case 'change-order': {
        const data = await fetchChangeOrderData(recordId, this.companyId)
        if (!data) {
          throw new Error('Change order not found')
        }
        return {
          variables: changeOrderToVariables(data, this.currency),
          vendorId: data.vendorId,
        }
      }

      case 'lien-release': {
        const data = await fetchLienReleaseData(recordId, this.companyId)
        if (!data) {
          throw new Error('Lien release not found')
        }
        return {
          variables: lienReleaseToVariables(data, this.currency),
          vendorId: data.vendorId,
        }
      }

      // Future: Add other record types
      case 'purchase-order':
      case 'vendor-contract':
      case 'estimate':
      case 'bid':
        throw new Error(`Record type '${recordType}' is not yet supported`)

      default:
        throw new Error(`Unknown record type: ${recordType}`)
    }
  }

  /**
   * Substitute all variables in the template content
   */
  private substituteVariables(
    content: string,
    variables: VariableResolver
  ): string {
    let result = content

    // Replace all known variables
    Object.entries(variables).forEach(([key, value]) => {
      // Use global replace to catch all instances
      result = result.split(key).join(value ?? '')
    })

    // Optionally: Highlight any remaining unsubstituted variables
    // result = result.replace(
    //   /\{\{[a-zA-Z0-9_.]+\}\}/g,
    //   '<span style="background-color: #fef3c7; color: #92400e;">$&</span>'
    // )

    return result
  }

  /**
   * Generate appropriate filename based on record type and data
   */
  private generateFilename(
    recordType: GenerateDocumentInput['recordType'],
    variables: VariableResolver
  ): string {
    const timestamp = new Date().toISOString().split('T')[0]

    switch (recordType) {
      case 'change-order':
        const coNumber = variables['{{changeOrder.number}}'] || 'CO'
        return `Change_Order_${coNumber.replace(/[^a-zA-Z0-9-]/g, '_')}_${timestamp}.pdf`

      case 'lien-release':
        const releaseType = variables['{{lienRelease.type}}'] || 'LIEN_RELEASE'
        const releaseRef = variables['{{contract.number}}'] || variables['{{lienRelease.id}}'] || 'Release'
        return `Lien_Release_${releaseType}_${releaseRef}`.replace(/[^a-zA-Z0-9-_]/g, '_') + `_${timestamp}.pdf`

      case 'purchase-order':
        const poNumber = variables['{{purchaseOrder.number}}'] || 'PO'
        return `Purchase_Order_${poNumber}_${timestamp}.pdf`

      case 'vendor-contract':
        const contractNumber = variables['{{contract.number}}'] || 'Contract'
        return `Contract_${contractNumber}_${timestamp}.pdf`

      case 'estimate':
        const estimateNumber = variables['{{estimate.number}}'] || 'Estimate'
        return `Estimate_${estimateNumber}_${timestamp}.pdf`

      case 'bid':
        const company = variables['{{vendor.companyName}}'] || 'Bid'
        return `Bid_${company.replace(/[^a-zA-Z0-9-]/g, '_')}_${timestamp}.pdf`

      default:
        return `Document_${timestamp}.pdf`
    }
  }
}

/**
 * Helper function to create a generator instance
 */
export async function createDocumentGenerator(
  companyId: string
): Promise<DocumentGenerator> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { currency: true },
  })

  return new DocumentGenerator(companyId, company?.currency || 'USD')
}

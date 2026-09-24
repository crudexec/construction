import type { Prisma } from '@prisma/client'

export class AssetProfileError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

// Additional create-form fields are validated before creating the asset, so
// an invalid custom field or foreign-company vendor cannot leave a partial record.
export async function createProfileData(tx: Prisma.TransactionClient, companyId: string, body: Record<string, unknown>) {
  const text = (key: string) => {
    const value = body[key]
    if (value == null || value === '') return null
    if (typeof value !== 'string') throw new AssetProfileError(`${key} must be text`)
    return value
  }
  const number = (key: string, integer = false) => {
    const raw = body[key]
    if (raw == null || raw === '') return null
    if (!['number', 'string'].includes(typeof raw) || !Number.isFinite(Number(raw)) || Number(raw) < 0 || (integer && !Number.isSafeInteger(Number(raw)))) throw new AssetProfileError(`${key} must be a non-negative ${integer ? 'integer' : 'number'}`)
    return Number(raw)
  }
  const financingType = text('financingType')
  if (financingType && !['CASH', 'FINANCED', 'LEASED'].includes(financingType)) throw new AssetProfileError('Invalid financing type')
  const purchasedFromVendorId = text('purchasedFromVendorId')
  if (purchasedFromVendorId && !await tx.vendor.findFirst({ where: { id: purchasedFromVendorId, companyId }, select: { id: true } })) throw new AssetProfileError('Vendor not found', 404)
  const rawValues = body.customFieldValues ?? {}
  if (typeof rawValues !== 'object' || Array.isArray(rawValues)) throw new AssetProfileError('Custom field values must be an object')
  const values = Object.entries(rawValues)
  const definitions = await tx.assetCustomFieldDefinition.findMany({ where: { id: { in: values.map(([id]) => id) }, companyId, isActive: true } })
  if (definitions.length !== values.length) throw new AssetProfileError('One or more active custom fields not found', 404)
  const customFieldValues = values.map(([fieldDefinitionId, rawValue]) => {
    const definition = definitions.find(field => field.id === fieldDefinitionId)!
    if (rawValue !== null && !['string', 'number', 'boolean'].includes(typeof rawValue)) throw new AssetProfileError(`Invalid value for ${definition.name}`)
    const value = rawValue == null || rawValue === '' ? null : String(rawValue)
    if (value !== null) {
      if (definition.fieldType === 'NUMBER' && (!value.trim() || !Number.isFinite(Number(value)))) throw new AssetProfileError(`${definition.name} must be a number`)
      if (definition.fieldType === 'BOOLEAN' && !['true', 'false'].includes(value)) throw new AssetProfileError(`${definition.name} must be Yes or No`)
      if (definition.fieldType === 'SELECT' && !definition.selectOptions.includes(value)) throw new AssetProfileError(`Invalid option for ${definition.name}`)
      if (definition.fieldType === 'DATE' && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) throw new AssetProfileError(`${definition.name} must be a valid date`)
    }
    return { fieldDefinitionId, value }
  })
  return {
    purchasedFromVendorId, financingType: financingType as 'CASH' | 'FINANCED' | 'LEASED' | null,
    poNumber: text('poNumber'), invoiceNumber: text('invoiceNumber'), customStatusNote: text('customStatusNote'),
    financedAmount: number('financedAmount'), lender: text('lender'), loanTermMonths: number('loanTermMonths', true),
    depreciationMethod: text('depreciationMethod'), usefulLifeYears: number('usefulLifeYears', true), salvageValue: number('salvageValue'),
    customFieldValues: { create: customFieldValues },
  }
}

export const STANDARD_ASSET_FIELDS = {
  equipmentId: 'Equipment ID', name: 'Asset Name', type: 'Asset Type', category: 'Category',
  status: 'Status', customStatusNote: 'Status Note', serialNumber: 'Serial Number',
  make: 'Make', model: 'Model', year: 'Year', vin: 'VIN', licensePlate: 'License Plate',
  description: 'Description', locationSelection: 'Location (job or yard)', currentAssigneeId: 'Assignment (person)',
  purchaseCost: 'Purchase Cost', purchaseDate: 'Purchase Date', warrantyExpiry: 'Warranty Expiry',
  purchasedFromVendorId: 'Purchased From (Vendor)', poNumber: 'PO Number', invoiceNumber: 'Invoice Number',
  financingType: 'Financing Type', financedAmount: 'Financed Amount', lender: 'Lender',
  loanTermMonths: 'Loan Term (months)', depreciationMethod: 'Depreciation Method', usefulLifeYears: 'Useful Life (years)',
  salvageValue: 'Salvage Value', notes: 'Notes',
} as const

export type StandardAssetField = keyof typeof STANDARD_ASSET_FIELDS
export const PURCHASE_FIELDS: StandardAssetField[] = ['purchaseCost', 'purchaseDate', 'warrantyExpiry', 'purchasedFromVendorId', 'poNumber', 'invoiceNumber', 'financingType', 'financedAmount', 'lender', 'loanTermMonths', 'depreciationMethod', 'usefulLifeYears', 'salvageValue']

export interface AssetCustomField {
  id: string
  name: string
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'
  selectOptions: string[]
  isActive: boolean
}
export interface AssetFieldLayout {
  order: string[]
  version: number
  customFields: AssetCustomField[]
}

export function defaultAssetFieldOrder(customFields: Pick<AssetCustomField, 'id'>[]) {
  return [...Object.keys(STANDARD_ASSET_FIELDS), ...customFields.map(field => `custom:${field.id}`)]
}

export function resolveAssetFieldOrder(saved: string[], customFields: Pick<AssetCustomField, 'id'>[]) {
  const defaults = defaultAssetFieldOrder(customFields)
  const allowed = new Set(defaults)
  // Deleted fields are ignored; new fields are appended without hiding anything.
  return [...new Set([...saved.filter(key => allowed.has(key)), ...defaults])]
}

export type AssetProfileValues = Record<Exclude<StandardAssetField, 'type' | 'status' | 'financingType'>, string> & {
  type: 'VEHICLE' | 'EQUIPMENT' | 'TOOL'
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'
  financingType: '' | 'CASH' | 'FINANCED' | 'LEASED'
  statusDefinitionId: string
  currentLocation: string
}

export function emptyAssetProfile(): AssetProfileValues {
  return {
    equipmentId: '', name: '', type: 'EQUIPMENT', category: '', status: 'AVAILABLE', customStatusNote: '',
    serialNumber: '', make: '', model: '', year: '', vin: '', licensePlate: '', description: '', locationSelection: '',
    currentAssigneeId: '', purchaseCost: '', purchaseDate: '', warrantyExpiry: '', purchasedFromVendorId: '',
    poNumber: '', invoiceNumber: '', financingType: '', financedAmount: '', lender: '', loanTermMonths: '',
    depreciationMethod: '', usefulLifeYears: '', salvageValue: '', notes: '', statusDefinitionId: '', currentLocation: '',
  }
}

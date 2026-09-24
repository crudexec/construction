'use client'

import { type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AssetStatusSelect } from './asset-status-select'
import { AssetCategoryField } from './asset-category-field'
import { AssetLocationSelect, AssetPersonSelect } from './asset-context-fields'
import { DatePicker } from '@/components/ui/date-picker'
import { STANDARD_ASSET_FIELDS, PURCHASE_FIELDS, resolveAssetFieldOrder, type AssetFieldLayout, type AssetProfileValues, type StandardAssetField } from '@/lib/assets/field-layout'

type StatusDefinition = { id: string; name: string; baseStatus: AssetProfileValues['status'] }
const inputClass = 'w-full border border-gray-300 rounded-md px-3 py-2'
const numberFields = new Set(['year', 'purchaseCost', 'financedAmount', 'loanTermMonths', 'usefulLifeYears', 'salvageValue'])
const moneyFields = new Set(['purchaseCost', 'financedAmount', 'salvageValue'])
const dateFields = new Set(['purchaseDate', 'warrantyExpiry'])

export function AssetProfileFields({ values, onChange, customValues, onCustomChange, layout, statuses, currentStatus, currentLocation, currentPerson, onNewStatus, purchaseOnly = false, creating = false }: {
  values: AssetProfileValues
  onChange: (patch: Partial<AssetProfileValues>) => void
  customValues: Record<string, string>
  onCustomChange: (id: string, value: string) => void
  layout: AssetFieldLayout
  statuses: StatusDefinition[]
  currentStatus?: StatusDefinition | null
  currentLocation?: string | null
  currentPerson?: string | null
  onNewStatus?: () => void
  purchaseOnly?: boolean
  creating?: boolean
}) {
  const vendors = useQuery<{ id: string; companyName: string; name: string }[]>({
    queryKey: ['asset-vendor-options'],
    queryFn: async () => {
      const response = await fetch('/api/vendors')
      if (!response.ok) throw new Error('Could not load vendors')
      return response.json()
    },
  })
  const order = resolveAssetFieldOrder(layout.order, layout.customFields)

  function standard(key: StandardAssetField): ReactNode {
    if (key === 'category') return <AssetCategoryField type={values.type} value={values.category} onChange={category => onChange({ category })} />
    if (key === 'locationSelection') return <AssetLocationSelect value={values.locationSelection} onChange={locationSelection => onChange({ locationSelection })} currentLabel={currentLocation} />
    if (key === 'currentAssigneeId') return <AssetPersonSelect value={values.currentAssigneeId} onChange={currentAssigneeId => onChange({ currentAssigneeId })} currentLabel={currentPerson} />
    const label = key === 'name' && !creating ? 'Name' : key === 'type' && !creating ? 'Type' : key === 'notes' && creating ? 'Additional Notes' : STANDARD_ASSET_FIELDS[key]
    const required = ['name', 'type', 'status'].includes(key)
    const id = key === 'equipmentId' ? key : `profile-${key}`
    let control: ReactNode
    if (key === 'status') control = <AssetStatusSelect id={id} status={values.status} statusDefinitionId={values.statusDefinitionId} definitions={statuses} currentDefinition={currentStatus} onChange={onChange} />
    else if (key === 'type') control = <select id={id} value={values.type} onChange={event => onChange({ type: event.target.value as AssetProfileValues['type'], category: '' })} className={inputClass} required><option value="VEHICLE">Vehicle</option><option value="EQUIPMENT">Equipment</option><option value="TOOL">Tool</option></select>
    else if (key === 'purchasedFromVendorId') control = <>
      <select id={id} value={values[key]} onChange={event => onChange({ [key]: event.target.value })} disabled={vendors.isPending || vendors.isError} className={inputClass}>
        <option value="">—</option>
        {values[key] && !vendors.data?.some(vendor => vendor.id === values[key]) && <option value={values[key]}>Current vendor</option>}
        {vendors.data?.map(vendor => <option key={vendor.id} value={vendor.id}>{vendor.companyName || vendor.name}</option>)}
      </select>
      {vendors.isError && <p role="alert" className="text-sm text-red-600">Could not load vendors. <button type="button" className="underline" onClick={() => vendors.refetch()}>Retry</button></p>}
    </>
    else if (key === 'financingType') control = <select id={id} value={values[key]} onChange={event => onChange({ financingType: event.target.value as AssetProfileValues['financingType'] })} className={inputClass}><option value="">—</option><option value="CASH">Cash</option><option value="FINANCED">Financed</option><option value="LEASED">Leased</option></select>
    else if (dateFields.has(key)) control = <DatePicker id={id} value={values[key]} onChange={value => onChange({ [key]: value })} placeholder="Select date" />
    else if (key === 'notes' || key === 'description') control = <textarea id={id} rows={3} value={values[key]} onChange={event => onChange({ [key]: event.target.value })} className={inputClass} />
    else control = <input id={id} type={numberFields.has(key) ? 'number' : 'text'} step={moneyFields.has(key) ? '0.01' : undefined} min={numberFields.has(key) ? 0 : undefined} maxLength={key === 'equipmentId' ? 100 : undefined} value={values[key]} onChange={event => onChange({ [key]: event.target.value })} required={required} className={inputClass} />
    return <>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}{required ? ' *' : ''}</label>
      {control}
      {key === 'equipmentId' && <p className="mt-1 text-xs text-gray-500">Your fleet identifier. Optional; must be unique within your company.</p>}
      {key === 'status' && onNewStatus && <button type="button" onClick={onNewStatus} className="mt-1 text-xs font-medium text-primary-600">New Custom Status</button>}
    </>
  }

  return <div aria-label="Asset profile fields" className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {order.map(key => {
      if (purchaseOnly && !PURCHASE_FIELDS.includes(key as StandardAssetField)) return null
      if (key.startsWith('custom:')) {
        const field = layout.customFields.find(field => `custom:${field.id}` === key)
        if (!field?.isActive) return null
        const value = customValues[field.id] || ''
        const id = `custom-${field.id}`
        return <div key={key} data-field-key={key}>
          <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{field.name}</label>
          {field.fieldType === 'SELECT' || field.fieldType === 'BOOLEAN' ? <select id={id} value={value} onChange={event => onCustomChange(field.id, event.target.value)} className={inputClass}>
            <option value="">—</option>
            {field.fieldType === 'BOOLEAN' ? <><option value="true">Yes</option><option value="false">No</option></> : <>
              {value && !field.selectOptions.includes(value) && <option value={value}>{value} (previous option)</option>}
              {field.selectOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </>}
          </select> : <input id={id} type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'} step={field.fieldType === 'NUMBER' ? 'any' : undefined} value={value} onChange={event => onCustomChange(field.id, event.target.value)} className={inputClass} />}
        </div>
      }
      return <div key={key} data-field-key={key} className={key === 'description' || key === 'notes' ? 'md:col-span-2' : ''}>{standard(key as StandardAssetField)}</div>
    })}
  </div>
}

export function AssetProfileOverview({ layout, values, customValues, purchaseOnly = false }: {
  layout: AssetFieldLayout
  values: Partial<Record<StandardAssetField, ReactNode>>
  customValues: { value: string | null; definition: { id: string; name: string; fieldType: string; isActive?: boolean } }[]
  purchaseOnly?: boolean
}) {
  // Include retained inactive values even if a definition is absent from a stale layout response.
  const definitions = [...layout.customFields, ...customValues.map(value => value.definition)]
  return <div aria-label="Asset profile values" className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {resolveAssetFieldOrder(layout.order, definitions).map(key => {
      if (purchaseOnly && !PURCHASE_FIELDS.includes(key as StandardAssetField)) return null
      const custom = customValues.find(value => key === `custom:${value.definition.id}`)
      const value = custom ? custom.value === 'true' && custom.definition.fieldType === 'BOOLEAN' ? 'Yes' : custom.value === 'false' && custom.definition.fieldType === 'BOOLEAN' ? 'No' : custom.value : values[key as StandardAssetField]
      if (value === undefined || value === null || value === '') return null
      const definition = custom && layout.customFields.find(field => field.id === custom.definition.id)
      const label = custom ? `${custom.definition.name}${definition?.isActive === false ? ' (inactive)' : ''}` : STANDARD_ASSET_FIELDS[key as StandardAssetField]
      return <div key={key} data-field-key={key} className={key === 'description' || key === 'notes' ? 'md:col-span-2' : ''}>
        <span className="text-sm font-medium text-gray-500">{label}:</span>
        <div className="text-gray-900 mt-1 whitespace-pre-wrap break-words">{value}</div>
      </div>
    })}
  </div>
}

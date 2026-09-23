'use client'

type AssetStatus = 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'

interface StatusDefinition {
  id: string
  name: string
  baseStatus: AssetStatus
}

interface AssetStatusSelectProps {
  id: string
  status: AssetStatus
  statusDefinitionId: string
  definitions: StatusDefinition[]
  currentDefinition?: StatusDefinition | null
  onChange: (value: { status: AssetStatus; statusDefinitionId: string }) => void
}

const standardStatuses: { value: AssetStatus; label: string }[] = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'UNDER_MAINTENANCE', label: 'Under Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'LOST_DAMAGED', label: 'Lost/Damaged' },
]

export function AssetStatusSelect({ id, status, statusDefinitionId, definitions, currentDefinition, onChange }: AssetStatusSelectProps) {
  const missingCurrent = statusDefinitionId && !definitions.some(definition => definition.id === statusDefinitionId)

  return (
    <select
      id={id}
      name="status"
      value={statusDefinitionId ? `custom:${statusDefinitionId}` : status}
      onChange={(event) => {
        const definition = definitions.find(item => `custom:${item.id}` === event.target.value)
        if (definition) {
          onChange({ status: definition.baseStatus, statusDefinitionId: definition.id })
          return
        }
        const standard = standardStatuses.find(item => item.value === event.target.value)
        if (standard) onChange({ status: standard.value, statusDefinitionId: '' })
      }}
      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      required
    >
      {missingCurrent && (
        <option value={`custom:${statusDefinitionId}`} disabled>
          {currentDefinition?.name || 'Current status'}
        </option>
      )}
      {definitions.length > 0 && (
        <optgroup label="Company statuses">
          {definitions.map(definition => (
            <option key={definition.id} value={`custom:${definition.id}`}>{definition.name}</option>
          ))}
        </optgroup>
      )}
      <optgroup label="Standard statuses">
        {standardStatuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </optgroup>
    </select>
  )
}

'use client'

import { contractDate, contractDuration } from '@/lib/contracts/details'

export interface ContractDetailsValues {
  contractNumber: string; title: string; description: string; estimateReference: string; estimateAmount: string
  totalSum: string; startDate: string; endDate: string; retentionPercent: string; retentionBond: string; terms: string; notes: string
}

export function detailsValues(contract: {
  contractNumber: string; title?: string | null; description?: string | null; estimateReference?: string | null; estimateAmount?: number | null
  totalSum: number; startDate: string; endDate?: string | null; retentionPercent?: number | null; retentionBond?: string | null; terms?: string | null; notes?: string | null
}): ContractDetailsValues {
  return {
    contractNumber: contract.contractNumber, title: contract.title ?? '', description: contract.description ?? '',
    estimateReference: contract.estimateReference ?? '', estimateAmount: contract.estimateAmount == null ? '' : String(contract.estimateAmount),
    totalSum: String(contract.totalSum), startDate: contractDate(contract.startDate), endDate: contractDate(contract.endDate),
    retentionPercent: String(contract.retentionPercent ?? 0), retentionBond: contract.retentionBond ?? '', terms: contract.terms ?? '', notes: contract.notes ?? ''
  }
}

export function ContractDetailsFields({ value, onChange, approvedChanges, disabled }: {
  value: ContractDetailsValues; onChange: (value: ContractDetailsValues) => void; approvedChanges: number; disabled: boolean
}) {
  const duration = contractDuration(value.startDate, value.endDate)
  const currency = (amount: number) => Number.isFinite(amount) ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '—'
  return <fieldset disabled={disabled} aria-label="Edit contract details" className="bg-white border rounded p-4 space-y-3">
    <legend className="text-sm font-semibold px-1">Edit Contract Details</legend>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {([
        ['contractNumber', 'Contract Number', 'text'], ['title', 'Title', 'text'], ['estimateReference', 'Estimate Reference', 'text'],
        ['totalSum', 'Original Contract Amount', 'number'], ['estimateAmount', 'Estimated Amount (optional)', 'number'], ['retentionPercent', 'Retention %', 'number'],
        ['startDate', 'Start Date', 'date'], ['endDate', 'End Date (optional)', 'date'],
      ] as const).map(([key, label, type]) => <label key={key} className="text-sm text-gray-700">
        <span className="block mb-1">{label}</span>
        <input type={type} value={value[key]} onChange={e => onChange({ ...value, [key]: e.target.value })}
          required={['contractNumber', 'totalSum', 'startDate', 'retentionPercent'].includes(key)}
          min={type === 'number' ? 0 : undefined} max={key === 'retentionPercent' ? 100 : undefined} step={type === 'number' ? '0.01' : undefined}
          className={`w-full border rounded px-2 py-1.5 ${type === 'number' ? 'text-right tabular-nums' : ''}`} />
      </label>)}
      <div className="text-sm"><p>Duration (elapsed calendar days)</p><p className="font-semibold mt-1">{duration === null ? 'Not specified' : `${duration} days`}</p></div>
      <div className="text-sm"><p>Current Contract Value (calculated)</p><p className="font-semibold mt-1">{currency(Number(value.totalSum) + approvedChanges)}</p><p className="text-xs text-gray-500">Original amount + {currency(approvedChanges)} approved change orders.</p></div>
    </div>
    <label className="block text-sm">Description<textarea value={value.description} onChange={e => onChange({ ...value, description: e.target.value })} rows={3} className="block w-full border rounded px-2 py-1.5 mt-1" /></label>
    <p className="text-xs text-gray-500">Blank estimated amount means not supplied; $0 is a valid estimate. Estimates do not change contract value. Editing the original amount locks it against automatic line-item recalculation. Dates do not move tasks or payments.</p>
  </fieldset>
}

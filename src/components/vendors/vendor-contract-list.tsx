'use client'

import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'
import { contractDate } from '@/lib/contracts/details'

export interface VendorContractSummary {
  id: string; contractNumber: string; title?: string | null; status: string; totalSum: number
  estimateReference?: string | null; estimateAmount?: number | null; retentionPercent?: number | null
  startDate: string; endDate?: string | null
  projects: { project: { id: string; title: string } }[]
  changeOrders?: { totalAmount: number; status?: string }[]
}
export function VendorContractList({ vendorId, contracts }: { vendorId: string; contracts: VendorContractSummary[] }) {
  const { format } = useCurrency()
  return <div className="divide-y" aria-label="Vendor contract summaries">{contracts.map(contract => {
    const approved = (contract.changeOrders ?? []).filter(co => !co.status || co.status === 'APPROVED').reduce((sum, co) => sum + co.totalAmount, 0)
    const current = Math.round((contract.totalSum + approved) * 100) / 100
    const retention = Math.round(current * (contract.retentionPercent ?? 0)) / 100
    return <article key={contract.id} className="p-4 space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2"><Link className="font-semibold text-primary-700 hover:underline" href={`/dashboard/vendors/${vendorId}/contracts/${contract.id}`}>{contract.contractNumber}{contract.title ? ` — ${contract.title}` : ''}</Link><span className="text-xs bg-gray-100 rounded px-2 py-1">{contract.status}</span></header>
      <div className="flex flex-wrap gap-2 text-sm"><span className="text-gray-500">Job:</span>{contract.projects.length ? contract.projects.map(({ project }) => <Link key={project.id} className="text-primary-700 hover:underline" href={`/dashboard/projects/${project.id}?tab=vendors`}>{project.title}</Link>) : <span>Not linked</span>}</div>
      <dl className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {([['Original Contract', format(contract.totalSum)], ['Approved Changes', format(approved)], ['Current Value', format(current)], ['Contract Retention', `${contract.retentionPercent ?? 0}% · ${format(retention)}`], ['Estimated Amount', contract.estimateAmount == null ? 'Not supplied' : format(contract.estimateAmount)], ['Estimate Reference', contract.estimateReference || 'Not supplied']] as const).map(([label, value]) => <div key={label}><dt className="text-xs text-gray-500">{label}</dt><dd className="font-medium tabular-nums break-words">{value}</dd></div>)}
      </dl>
      <p className="text-xs text-gray-500">{contractDate(contract.startDate)} – {contractDate(contract.endDate) || 'End date not set'}. Contract retention is calculated on current value; it is not retention already held on payments.</p>
    </article>
  })}</div>
}

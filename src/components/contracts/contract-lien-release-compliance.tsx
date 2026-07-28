'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Link2, Search } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface ContractProjectOption {
  id: string
  title: string
  status: string
  projectNumber?: string | null
}

interface ContractSupplierOption {
  id: string
  supplier: {
    id: string
    name: string
  }
}

interface LienReleaseDocument {
  id: string
  kind: string
  originalName: string
  createdAt: string
}

interface LienReleaseRecord {
  id: string
  type: string
  status: string
  title?: string | null
  amount?: number | null
  throughDate?: string | null
  effectiveDate?: string | null
  externalPaymentRef?: string | null
  externalSource?: string | null
  supplier?: {
    id: string
    name: string
  } | null
  project?: {
    id: string
    title: string
    status: string
  } | null
  documents?: LienReleaseDocument[]
}

interface PaymentLienReleaseLink {
  id: string
  lienReleaseId: string
  lienRelease: LienReleaseRecord
}

interface ContractPayment {
  id: string
  amount: number
  paymentDate: string
  reference?: string | null
  billingPeriodDate?: string | null
  amountRequesting?: number | null
  acaAmountRequesting?: number | null
  amountApproved?: number | null
  apStatus: string
  pmStatus: string
  expectedLienReleaseCount?: number | null
  lienReleaseLinks?: PaymentLienReleaseLink[]
}

interface ContractLienReleaseComplianceProps {
  contractNumber: string
  vendorName: string
  projects: ContractProjectOption[]
  suppliers: ContractSupplierOption[]
  payments: ContractPayment[]
  lienReleases: LienReleaseRecord[]
}

interface ComplianceRow {
  id: string
  source: 'PAYMENT' | 'UNLINKED_RELEASE'
  project: string
  vendorOrSubtier: string
  paymentReference: string
  paymentPeriod: string
  paymentDate: string
  paymentAmount: number
  approvedAmount: number
  expectedReleaseCount: number
  linkedReleaseCount: number
  approvedReleaseCount: number
  conditionalStatus: string
  unconditionalStatus: string
  missingCount: number
  blocker: string
  apStatus: string
  releaseTitles: string
}

const BLOCKING_RELEASE_STATUSES = new Set(['DRAFT', 'REQUESTED', 'SUBMITTED', 'UNDER_REVIEW', 'REJECTED'])

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function releaseLabel(release: LienReleaseRecord) {
  return release.title || release.type.replaceAll('_', ' ')
}

function summarizeReleaseStatus(releases: LienReleaseRecord[], typePrefix: 'CONDITIONAL' | 'UNCONDITIONAL') {
  const matching = releases.filter((release) => release.type.startsWith(typePrefix))
  if (matching.length === 0) return 'Missing'
  const approved = matching.filter((release) => release.status === 'APPROVED').length
  if (approved === matching.length) return `Approved (${approved}/${matching.length})`
  const rejected = matching.filter((release) => release.status === 'REJECTED').length
  if (rejected > 0) return `Rejected (${rejected}/${matching.length})`
  return `In flight (${approved}/${matching.length})`
}

function csvEscape(value: string | number) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function ContractLienReleaseCompliance({
  contractNumber,
  vendorName,
  projects,
  suppliers,
  payments,
  lienReleases,
}: ContractLienReleaseComplianceProps) {
  const { format: formatCurrency } = useCurrency()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'BLOCKED' | 'MISSING' | 'APPROVED'>('ALL')

  const rows = useMemo<ComplianceRow[]>(() => {
    const linkedReleaseIds = new Set<string>()
    const fallbackProject = projects[0]?.title || '-'

    const paymentRows: ComplianceRow[] = payments.map((payment) => {
      const linkedReleases = (payment.lienReleaseLinks ?? []).map((link) => link.lienRelease)
      linkedReleases.forEach((release) => linkedReleaseIds.add(release.id))
      const expectedReleaseCount = payment.expectedLienReleaseCount ?? linkedReleases.length
      const approvedReleaseCount = linkedReleases.filter((release) => release.status === 'APPROVED').length
      const missingCount = Math.max(expectedReleaseCount - approvedReleaseCount, 0)
      const hasBlockingRelease = linkedReleases.some((release) => BLOCKING_RELEASE_STATUSES.has(release.status))
      const supplierNames = Array.from(new Set(linkedReleases.map((release) => release.supplier?.name).filter(Boolean)))
      const projectNames = Array.from(new Set(linkedReleases.map((release) => release.project?.title).filter(Boolean)))
      const blocker = missingCount > 0
        ? `${missingCount} missing/unfinished release${missingCount === 1 ? '' : 's'}`
        : hasBlockingRelease
          ? 'Release not approved'
          : payment.apStatus === 'PAID'
            ? 'Cleared'
            : 'Ready'

      return {
        id: payment.id,
        source: 'PAYMENT',
        project: projectNames.join(', ') || fallbackProject,
        vendorOrSubtier: supplierNames.join(', ') || vendorName,
        paymentReference: payment.reference || '-',
        paymentPeriod: formatDate(payment.billingPeriodDate),
        paymentDate: formatDate(payment.paymentDate),
        paymentAmount: payment.amountRequesting ?? payment.acaAmountRequesting ?? payment.amount ?? 0,
        approvedAmount: payment.amountApproved ?? 0,
        expectedReleaseCount,
        linkedReleaseCount: linkedReleases.length,
        approvedReleaseCount,
        conditionalStatus: summarizeReleaseStatus(linkedReleases, 'CONDITIONAL'),
        unconditionalStatus: summarizeReleaseStatus(linkedReleases, 'UNCONDITIONAL'),
        missingCount,
        blocker,
        apStatus: payment.apStatus,
        releaseTitles: linkedReleases.map(releaseLabel).join('; ') || '-',
      } satisfies ComplianceRow
    })

    const unlinkedRows: ComplianceRow[] = lienReleases
      .filter((release) => !linkedReleaseIds.has(release.id))
      .map((release) => ({
        id: `release-${release.id}`,
        source: 'UNLINKED_RELEASE',
        project: release.project?.title || fallbackProject,
        vendorOrSubtier: release.supplier?.name || vendorName,
        paymentReference: release.externalPaymentRef || '-',
        paymentPeriod: formatDate(release.throughDate),
        paymentDate: formatDate(release.effectiveDate),
        paymentAmount: release.amount ?? 0,
        approvedAmount: release.status === 'APPROVED' ? release.amount ?? 0 : 0,
        expectedReleaseCount: 1,
        linkedReleaseCount: 0,
        approvedReleaseCount: release.status === 'APPROVED' ? 1 : 0,
        conditionalStatus: release.type.startsWith('CONDITIONAL') ? release.status.replaceAll('_', ' ') : '-',
        unconditionalStatus: release.type.startsWith('UNCONDITIONAL') ? release.status.replaceAll('_', ' ') : '-',
        missingCount: release.status === 'APPROVED' ? 0 : 1,
        blocker: 'Unlinked release',
        apStatus: '-',
        releaseTitles: releaseLabel(release),
      } satisfies ComplianceRow))

    return paymentRows.concat(unlinkedRows)
  }, [lienReleases, payments, projects, vendorName])

  const filteredRows = rows.filter((row) => {
    const matchesQuery = !query.trim() || [
      row.project,
      row.vendorOrSubtier,
      row.paymentReference,
      row.releaseTitles,
      row.blocker,
      row.apStatus,
    ].some((value) => value.toLowerCase().includes(query.toLowerCase()))

    if (!matchesQuery) return false
    if (filter === 'BLOCKED') return row.blocker !== 'Cleared' && row.blocker !== 'Ready'
    if (filter === 'MISSING') return row.missingCount > 0
    if (filter === 'APPROVED') return row.missingCount === 0 && row.approvedReleaseCount > 0
    return true
  })

  const blockedCount = rows.filter((row) => row.blocker !== 'Cleared' && row.blocker !== 'Ready').length
  const missingCount = rows.reduce((sum, row) => sum + row.missingCount, 0)
  const approvedCount = rows.reduce((sum, row) => sum + row.approvedReleaseCount, 0)
  const expectedCount = rows.reduce((sum, row) => sum + row.expectedReleaseCount, 0)

  const exportCsv = () => {
    const headers = [
      'Project',
      'Vendor/Subtier',
      'Payment Ref',
      'Payment Period',
      'Payment Date',
      'Payment Amount',
      'Approved Amount',
      'Expected Releases',
      'Linked Releases',
      'Approved Releases',
      'Conditional Status',
      'Unconditional Status',
      'AP Status',
      'Blocker',
      'Linked Release Titles',
    ]
    const body = filteredRows.map((row) => [
      row.project,
      row.vendorOrSubtier,
      row.paymentReference,
      row.paymentPeriod,
      row.paymentDate,
      row.paymentAmount,
      row.approvedAmount,
      row.expectedReleaseCount,
      row.linkedReleaseCount,
      row.approvedReleaseCount,
      row.conditionalStatus,
      row.unconditionalStatus,
      row.apStatus,
      row.blocker,
      row.releaseTitles,
    ])
    const csv = [headers, ...body].map((line) => line.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${contractNumber}-lien-release-compliance.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div data-testid="lien-release-compliance" className="bg-white rounded border overflow-hidden">
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileSpreadsheet className="h-3.5 w-3.5 text-gray-500" />
          <h2 className="text-xs font-semibold text-gray-700">Lien Release Compliance</h2>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-100"
        >
          <Download className="h-3 w-3" />
          Export CSV
        </button>
      </div>

      <div className="border-b bg-blue-50/50 px-3 py-2">
        <div className="grid grid-cols-2 gap-3 text-[10px] md:grid-cols-4">
          <SummaryMetric label="Expected Releases" value={expectedCount} tone="text-gray-900" />
          <SummaryMetric label="Approved Releases" value={approvedCount} tone="text-green-700" />
          <SummaryMetric label="Missing / Unfinished" value={missingCount} tone="text-amber-700" />
          <SummaryMetric label="Blocked Rows" value={blockedCount} tone={blockedCount > 0 ? 'text-red-700' : 'text-green-700'} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-b px-3 py-2 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search project, vendor, ref, release, blocker"
            className="w-full rounded border border-gray-300 py-1.5 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {(['ALL', 'BLOCKED', 'MISSING', 'APPROVED'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`rounded border px-2 py-1 text-[10px] font-medium ${
                filter === option
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {filteredRows.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-gray-500">No compliance rows match the current filters</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1700px] text-xs">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-[10px] font-semibold text-gray-600">
                <HeaderCell>Project</HeaderCell>
                <HeaderCell>Vendor / Subtier</HeaderCell>
                <HeaderCell>Payment Ref</HeaderCell>
                <HeaderCell>Period</HeaderCell>
                <HeaderCell>Payment Date</HeaderCell>
                <HeaderCell>Payment Amount</HeaderCell>
                <HeaderCell>Approved Amount</HeaderCell>
                <HeaderCell>Releases</HeaderCell>
                <HeaderCell>Conditional</HeaderCell>
                <HeaderCell>Unconditional</HeaderCell>
                <HeaderCell>AP Status</HeaderCell>
                <HeaderCell>Blocker</HeaderCell>
                <HeaderCell>Linked Releases</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, index) => (
                <tr key={row.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <BodyCell>{row.project}</BodyCell>
                  <BodyCell>{row.vendorOrSubtier}</BodyCell>
                  <BodyCell>{row.paymentReference}</BodyCell>
                  <BodyCell>{row.paymentPeriod}</BodyCell>
                  <BodyCell>{row.paymentDate}</BodyCell>
                  <BodyCell>{formatCurrency(row.paymentAmount)}</BodyCell>
                  <BodyCell>{formatCurrency(row.approvedAmount)}</BodyCell>
                  <BodyCell>{row.approvedReleaseCount}/{row.expectedReleaseCount}</BodyCell>
                  <BodyCell>{row.conditionalStatus}</BodyCell>
                  <BodyCell>{row.unconditionalStatus}</BodyCell>
                  <BodyCell>{row.apStatus}</BodyCell>
                  <BodyCell>
                    <ComplianceBadge blocker={row.blocker} />
                  </BodyCell>
                  <BodyCell>
                    <span className="inline-flex max-w-[320px] items-center gap-1 truncate">
                      {row.source === 'PAYMENT' ? <Link2 className="h-3 w-3 flex-shrink-0 text-gray-400" /> : null}
                      <span className="truncate">{row.releaseTitles}</span>
                    </span>
                  </BodyCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryMetric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div>
      <p className="text-gray-500 uppercase">{label}</p>
      <p className={`font-semibold ${tone}`}>{value}</p>
    </div>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="px-3 py-1 whitespace-nowrap">{children}</th>
}

function BodyCell({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{children}</td>
}

function ComplianceBadge({ blocker }: { blocker: string }) {
  const isClear = blocker === 'Cleared' || blocker === 'Ready'
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
      isClear ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
    }`}>
      {isClear ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
      {blocker}
    </span>
  )
}

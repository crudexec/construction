'use client'

import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CircleDashed, Clock3, FileText, Plus, Upload, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { GenerateDocumentButton } from '@/components/documents/generate-document-button'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'

interface ContractProjectOption {
  id: string
  title: string
  status: string
}

interface LienReleaseDocument {
  id: string
  originalName: string
  url: string
  kind: string
  createdAt: string
}

interface LienReleaseUser {
  id: string
  firstName: string
  lastName: string
}

interface LienReleaseEventActorVendor {
  id: string
  name: string
  companyName: string
}

interface LienReleaseEvent {
  id: string
  eventType: string
  message?: string | null
  createdAt: string
  actorUser?: LienReleaseUser | null
  actorVendor?: LienReleaseEventActorVendor | null
}

interface ContractLienRelease {
  id: string
  type: 'CONDITIONAL_PROGRESS' | 'UNCONDITIONAL_PROGRESS' | 'CONDITIONAL_FINAL' | 'UNCONDITIONAL_FINAL'
  status: 'DRAFT' | 'REQUESTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'VOID'
  title?: string | null
  amount?: number | null
  throughDate?: string | null
  effectiveDate?: string | null
  externalPaymentRef?: string | null
  externalSource?: string | null
  requestedAt?: string | null
  submittedAt?: string | null
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  notes?: string | null
  project?: {
    id: string
    title: string
    status: string
  } | null
  requestedBy?: LienReleaseUser | null
  reviewedBy?: LienReleaseUser | null
  approvedBy?: LienReleaseUser | null
  documents: LienReleaseDocument[]
  events: LienReleaseEvent[]
}

interface ContractLienReleasesProps {
  contractId: string
  projects: ContractProjectOption[]
}

const TYPE_OPTIONS = [
  { value: 'CONDITIONAL_PROGRESS', label: 'Conditional Progress' },
  { value: 'UNCONDITIONAL_PROGRESS', label: 'Unconditional Progress' },
  { value: 'CONDITIONAL_FINAL', label: 'Conditional Final' },
  { value: 'UNCONDITIONAL_FINAL', label: 'Unconditional Final' },
] as const

const STATUS_STYLES: Record<ContractLienRelease['status'], string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REQUESTED: 'bg-amber-100 text-amber-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  VOID: 'bg-slate-200 text-slate-700',
}

const EVENT_STYLES: Record<string, { icon: typeof CheckCircle2; dot: string; label: string }> = {
  CREATED: { icon: CircleDashed, dot: 'bg-slate-400', label: 'Draft created' },
  REQUESTED: { icon: Clock3, dot: 'bg-amber-500', label: 'Requested from vendor' },
  SUBMITTED: { icon: Upload, dot: 'bg-blue-500', label: 'Submitted' },
  UNDER_REVIEW: { icon: FileText, dot: 'bg-indigo-500', label: 'Under review' },
  APPROVED: { icon: CheckCircle2, dot: 'bg-green-500', label: 'Approved' },
  REJECTED: { icon: XCircle, dot: 'bg-red-500', label: 'Rejected' },
  DOCUMENT_UPLOADED: { icon: Upload, dot: 'bg-cyan-500', label: 'Document uploaded' },
}

function formatActorName(user?: LienReleaseUser | null, vendor?: LienReleaseEventActorVendor | null) {
  if (user) return `${user.firstName} ${user.lastName}`
  if (vendor) return vendor.companyName || vendor.name
  return 'System'
}

function getTimelineDate(release: ContractLienRelease) {
  return release.approvedAt || release.submittedAt || release.requestedAt || release.throughDate || release.effectiveDate || release.documents[0]?.createdAt || ''
}

const getToken = () =>
  document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

async function fetchLienReleases(contractId: string): Promise<ContractLienRelease[]> {
  const token = getToken()
  const response = await fetch(`/api/contracts/${contractId}/lien-releases`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: document.cookie,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch lien releases')
  }

  return response.json()
}

export function ContractLienReleases({
  contractId,
  projects,
}: ContractLienReleasesProps) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [form, setForm] = useState({
    type: 'CONDITIONAL_PROGRESS',
    title: '',
    amount: '',
    throughDate: '',
    effectiveDate: '',
    projectId: '',
    externalPaymentRef: '',
    externalSource: 'Buidflo Payments',
    notes: '',
    requestVendorNow: true,
  })

  const { data: lienReleases = [], isLoading } = useQuery({
    queryKey: ['contract-lien-releases', contractId],
    queryFn: () => fetchLienReleases(contractId),
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contract-lien-releases', contractId] })
    queryClient.invalidateQueries({ queryKey: ['contract', contractId] })
  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const token = getToken()
      const response = await fetch(`/api/contracts/${contractId}/lien-releases`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: form.type,
          title: form.title || undefined,
          amount: form.amount ? parseFloat(form.amount) : undefined,
          throughDate: form.throughDate || undefined,
          effectiveDate: form.effectiveDate || undefined,
          projectId: form.projectId || undefined,
          externalPaymentRef: form.externalPaymentRef || undefined,
          externalSource: form.externalSource || undefined,
          notes: form.notes || undefined,
          requestVendorNow: form.requestVendorNow,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create lien release')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Lien release created')
      setIsCreateModalOpen(false)
      setForm({
        type: 'CONDITIONAL_PROGRESS',
        title: '',
        amount: '',
        throughDate: '',
        effectiveDate: '',
        projectId: '',
        externalPaymentRef: '',
        externalSource: 'Buidflo Payments',
        notes: '',
        requestVendorNow: true,
      })
      refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      rejectionReason,
    }: {
      id: string
      status: ContractLienRelease['status']
      rejectionReason?: string
    }) => {
      const token = getToken()
      const response = await fetch(`/api/lien-releases/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          rejectionReason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update lien release')
      }

      return response.json()
    },
    onSuccess: () => {
      refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async ({ lienReleaseId, file }: { lienReleaseId: string; file: File }) => {
      const token = getToken()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('kind', 'SIGNED_RELEASE')

      const response = await fetch(`/api/lien-releases/${lienReleaseId}/documents`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload document')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Signed release uploaded')
      refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleUploadClick = (lienReleaseId: string) => {
    setUploadTargetId(lienReleaseId)
    uploadInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && uploadTargetId) {
      uploadMutation.mutate({ lienReleaseId: uploadTargetId, file })
    }
    event.target.value = ''
  }

  const handleStatusAction = (release: ContractLienRelease, status: ContractLienRelease['status']) => {
    if (status === 'REJECTED') {
      const rejectionReason = prompt('Why is this release being rejected?')
      if (!rejectionReason) return
      updateStatusMutation.mutate({ id: release.id, status, rejectionReason })
      return
    }
    updateStatusMutation.mutate({ id: release.id, status })
  }

  const timelineEntries = lienReleases
    .flatMap((release) => {
      if (release.events.length > 0) {
        return release.events.map((event) => ({
          id: event.id,
          createdAt: event.createdAt,
          eventType: event.eventType,
          message: event.message,
          actorLabel: formatActorName(event.actorUser, event.actorVendor),
          releaseId: release.id,
          releaseTitle: release.title || TYPE_OPTIONS.find((option) => option.value === release.type)?.label || release.type,
          releaseStatus: release.status,
          amount: release.amount,
          projectTitle: release.project?.title || null,
        }))
      }

      return [{
        id: `${release.id}-fallback`,
        createdAt: getTimelineDate(release),
        eventType: release.status,
        message: 'Lien release entered this state',
        actorLabel: formatActorName(release.approvedBy || release.reviewedBy || release.requestedBy, null),
        releaseId: release.id,
        releaseTitle: release.title || TYPE_OPTIONS.find((option) => option.value === release.type)?.label || release.type,
        releaseStatus: release.status,
        amount: release.amount,
        projectTitle: release.project?.title || null,
      }]
    })
    .filter((entry) => entry.createdAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const approvedCount = lienReleases.filter((release) => release.status === 'APPROVED').length
  const pendingCount = lienReleases.filter((release) => ['REQUESTED', 'SUBMITTED', 'UNDER_REVIEW'].includes(release.status)).length
  const rejectedCount = lienReleases.filter((release) => release.status === 'REJECTED').length
  const totalTrackedAmount = lienReleases.reduce((sum, release) => sum + (release.amount || 0), 0)

  return (
    <div className="bg-white rounded border overflow-hidden">
      <div className="px-3 py-1.5 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-gray-500" />
          <h2 className="text-xs font-semibold text-gray-700">Lien Releases</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 hover:text-primary-800"
        >
          <Plus className="h-3 w-3" />
          New Request
        </button>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileChange}
      />

      {isLoading ? (
        <div className="px-3 py-6 text-center text-xs text-gray-500">Loading lien releases...</div>
      ) : lienReleases.length === 0 ? (
        <div className="px-3 py-6 text-center text-[10px] text-gray-500">No lien releases yet</div>
      ) : (
        <div className="space-y-4 p-3">
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-500">Tracked Releases</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{lienReleases.length}</p>
            </div>
            <div className="rounded border border-green-200 bg-green-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-green-700">Approved</p>
              <p className="mt-1 text-sm font-semibold text-green-800">{approvedCount}</p>
            </div>
            <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-amber-700">In Flight</p>
              <p className="mt-1 text-sm font-semibold text-amber-800">{pendingCount}</p>
            </div>
            <div className="rounded border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-blue-700">Amount Tracked</p>
              <p className="mt-1 text-sm font-semibold text-blue-800">{formatCurrency(totalTrackedAmount)}</p>
            </div>
          </div>

          <div className="rounded border border-gray-200">
            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-700">Contract Journey Timeline</h3>
              <p className="mt-0.5 text-[10px] text-gray-500">A chronological view of every lien release step on this contract.</p>
            </div>
            <div className="px-3 py-3">
              {timelineEntries.length === 0 ? (
                <p className="text-xs text-gray-500">No timeline activity yet.</p>
              ) : (
                <div className="space-y-0">
                  {timelineEntries.map((entry, index) => {
                    const eventStyle = EVENT_STYLES[entry.eventType] || { icon: FileText, dot: 'bg-gray-400', label: entry.eventType.replace(/_/g, ' ') }
                    const EventIcon = eventStyle.icon
                    return (
                      <div key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                        <div className="relative flex w-6 flex-col items-center">
                          <span className={`mt-1 h-2.5 w-2.5 rounded-full ${eventStyle.dot}`} />
                          {index < timelineEntries.length - 1 && (
                            <span className="absolute top-4 h-full w-px bg-gray-200" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 rounded border border-gray-100 bg-white px-3 py-2">
                          <div className="flex flex-col gap-1 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-900">
                                  <EventIcon className="h-3.5 w-3.5 text-gray-500" />
                                  {eventStyle.label}
                                </span>
                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${STATUS_STYLES[entry.releaseStatus]}`}>
                                  {entry.releaseStatus.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-700">{entry.releaseTitle}</p>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                                <span>{new Date(entry.createdAt).toLocaleString()}</span>
                                <span>By {entry.actorLabel}</span>
                                {entry.projectTitle && <span>Project: {entry.projectTitle}</span>}
                                {entry.amount !== null && entry.amount !== undefined && <span>{formatCurrency(entry.amount)}</span>}
                              </div>
                              {entry.message && (
                                <p className="mt-1 text-[10px] text-gray-600">{entry.message}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded border border-gray-200">
            <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-700">Release Records</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {lienReleases.map((release) => (
                <div key={release.id} className="px-3 py-3 space-y-2">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-gray-900">
                          {TYPE_OPTIONS.find((option) => option.value === release.type)?.label || release.type}
                        </span>
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${STATUS_STYLES[release.status]}`}>
                          {release.status.replace(/_/g, ' ')}
                        </span>
                        {release.amount !== null && release.amount !== undefined && (
                          <span className="text-xs text-gray-600">{formatCurrency(release.amount)}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-gray-500">
                        {release.title && <span>{release.title}</span>}
                        {release.project?.title && <span>Project: {release.project.title}</span>}
                        {release.throughDate && (
                          <span>Through: {new Date(release.throughDate).toLocaleDateString()}</span>
                        )}
                        {release.externalPaymentRef && <span>Ref: {release.externalPaymentRef}</span>}
                      </div>
                      {release.rejectionReason && (
                        <p className="text-[10px] text-red-600">Rejected: {release.rejectionReason}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <GenerateDocumentButton
                        recordType="lien-release"
                        recordId={release.id}
                        templateType="LIEN_RELEASE"
                        variant="dropdown"
                        className="!px-2.5 !py-1 !text-xs"
                        autoSaveMode="lien-release-document"
                        autoSaveTargetId={release.id}
                        autoSaveDocumentKind="DRAFT_RELEASE"
                        onAutoSaveSuccess={refresh}
                      />
                      <button
                        type="button"
                        onClick={() => handleUploadClick(release.id)}
                        className="inline-flex items-center gap-1 rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        <Upload className="h-3 w-3" />
                        Upload Signed
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {release.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => handleStatusAction(release, 'REQUESTED')}
                        className="rounded bg-amber-100 px-2 py-1 font-medium text-amber-700 hover:bg-amber-200"
                      >
                        Request From Vendor
                      </button>
                    )}
                    {(release.status === 'REQUESTED' || release.status === 'REJECTED') && (
                      <button
                        type="button"
                        onClick={() => handleStatusAction(release, 'UNDER_REVIEW')}
                        className="rounded bg-indigo-100 px-2 py-1 font-medium text-indigo-700 hover:bg-indigo-200"
                      >
                        Move To Review
                      </button>
                    )}
                    {(release.status === 'SUBMITTED' || release.status === 'UNDER_REVIEW') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStatusAction(release, 'APPROVED')}
                          className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 font-medium text-green-700 hover:bg-green-200"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusAction(release, 'REJECTED')}
                          className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-1 font-medium text-red-700 hover:bg-red-200"
                        >
                          <XCircle className="h-3 w-3" />
                          Reject
                        </button>
                      </>
                    )}
                    {release.status === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-green-700">
                        <Clock3 className="h-3 w-3" />
                        Approved {release.approvedAt ? new Date(release.approvedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                    {release.status === 'REJECTED' && rejectedCount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-red-700">
                        <XCircle className="h-3 w-3" />
                        Needs correction
                      </span>
                    )}
                  </div>

                  {release.documents.length > 0 && (
                    <div className="rounded border border-gray-100 bg-gray-50 px-2 py-2">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Documents</p>
                      <div className="flex flex-wrap gap-2">
                        {release.documents.map((document) => (
                          <button
                            key={document.id}
                            type="button"
                            onClick={() => window.open(document.url, '_blank')}
                            className="rounded border border-gray-200 bg-white px-2 py-1 text-[10px] text-gray-700 hover:bg-gray-100"
                          >
                            {document.kind.replace(/_/g, ' ')}: {document.originalName}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="text-sm font-medium text-gray-900">Create Lien Release</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="text-xl">&times;</span>
              </button>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault()
                createMutation.mutate()
              }}
              className="space-y-3 p-4"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Type</label>
                  <select
                    value={form.type}
                    onChange={(event) => setForm({ ...form, type: event.target.value })}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                  >
                    {TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) => setForm({ ...form, amount: event.target.value })}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="April progress release"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Through Date</label>
                  <DatePicker
                    value={form.throughDate}
                    onChange={(date) => setForm({ ...form, throughDate: date })}
                    placeholder="Select date"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Effective Date</label>
                  <DatePicker
                    value={form.effectiveDate}
                    onChange={(date) => setForm({ ...form, effectiveDate: date })}
                    placeholder="Select date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">Project</label>
                  <select
                    value={form.projectId}
                    onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                  >
                    <option value="">No specific project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">External Payment Ref</label>
                  <input
                    type="text"
                    value={form.externalPaymentRef}
                    onChange={(event) => setForm({ ...form, externalPaymentRef: event.target.value })}
                    className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                    placeholder="PAY-10492"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">External Source</label>
                <input
                  type="text"
                  value={form.externalSource}
                  onChange={(event) => setForm({ ...form, externalSource: event.target.value })}
                  className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="Buidflo Payments"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  rows={3}
                  className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm"
                  placeholder="Optional compliance notes"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={form.requestVendorNow}
                  onChange={(event) => setForm({ ...form, requestVendorNow: event.target.checked })}
                />
                Mark as requested immediately
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded bg-primary-600 px-3 py-1.5 text-xs text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

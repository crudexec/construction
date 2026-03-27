'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Star,
  Briefcase,
  FileText,
  Users,
  Target,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Paperclip,
  Building2,
  Shield,
  Activity,
  Upload
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

async function uploadFile(vendorId: string, file: File) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const formData = new FormData()
  formData.append('file', file)
  formData.append('name', file.name)

  const response = await fetch(`/api/vendor/${vendorId}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: formData
  })
  if (!response.ok) throw new Error('Failed to upload file')
  return response.json()
}

interface VendorOverviewProps {
  vendor: any
  contracts?: any[]
  milestones?: any[]
  files?: any[]
  onTabChange?: (tab: string) => void
}

const getStatusBadge = (status: string) => {
  const configs: Record<string, { bg: string; text: string }> = {
    'ACTIVE': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    'COMPLETED': { bg: 'bg-blue-100', text: 'text-blue-700' },
    'DRAFT': { bg: 'bg-gray-100', text: 'text-gray-700' },
    'TERMINATED': { bg: 'bg-red-100', text: 'text-red-700' },
    'EXPIRED': { bg: 'bg-orange-100', text: 'text-orange-700' },
    'PENDING': { bg: 'bg-amber-100', text: 'text-amber-700' },
    'IN_PROGRESS': { bg: 'bg-blue-100', text: 'text-blue-700' },
  }
  const config = configs[status] || { bg: 'bg-gray-100', text: 'text-gray-700' }
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bg} ${config.text}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

const getContractTypeLabel = (type: string) => {
  const labels: Record<string, string> = {
    'LUMP_SUM': 'Lump Sum',
    'REMEASURABLE': 'Remeasurable',
    'ADDENDUM': 'Addendum'
  }
  return labels[type] || type
}

export function VendorOverview({
  vendor,
  contracts = [],
  milestones = [],
  files = [],
  onTabChange
}: VendorOverviewProps) {
  const { format: formatCurrency } = useCurrency()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(vendor.id, file),
    onSuccess: () => {
      toast.success('File uploaded successfully!')
      queryClient.invalidateQueries({ queryKey: ['vendor-files', vendor.id] })
      queryClient.invalidateQueries({ queryKey: ['vendor-files-overview', vendor.id] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Calculate metrics
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE').length
  const completedMilestones = milestones.filter((m: any) => m.status === 'COMPLETED').length

  const overdueMilestones = milestones.filter((m: any) =>
    m.status !== 'COMPLETED' && m.targetDate && new Date(m.targetDate) < new Date()
  )

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getVendorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'SUPPLY_AND_INSTALLATION': 'Supply & Install',
      'SUPPLY': 'Supply Only',
      'INSTALLATION': 'Installation Only'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-3">
      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Vendor Information */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600 w-28">Type</td>
                  <td className="px-3 py-2 font-semibold">{getVendorTypeLabel(vendor.type)}</td>
                </tr>
                {vendor.category && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Category</td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex px-2 py-0.5 rounded text-xs font-medium"
                        style={{ backgroundColor: vendor.category.color + '20', color: vendor.category.color }}
                      >
                        {vendor.category.csiDivision && `${vendor.category.csiDivision} - `}
                        {vendor.category.name}
                      </span>
                    </td>
                  </tr>
                )}
                {vendor.phone && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Phone</td>
                    <td className="px-3 py-2">
                      <a href={`tel:${vendor.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {vendor.phone}
                      </a>
                    </td>
                  </tr>
                )}
                {vendor.email && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Email</td>
                    <td className="px-3 py-2">
                      <a href={`mailto:${vendor.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {vendor.email}
                      </a>
                    </td>
                  </tr>
                )}
                {vendor.website && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Website</td>
                    <td className="px-3 py-2">
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        {vendor.website.replace(/^https?:\/\//, '')}
                      </a>
                    </td>
                  </tr>
                )}
                {(vendor.address || vendor.city) && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Address</td>
                    <td className="px-3 py-2 flex items-start gap-1">
                      <MapPin className="h-3 w-3 mt-0.5 text-gray-400 flex-shrink-0" />
                      <span>
                        {vendor.address && <span>{vendor.address}</span>}
                        {vendor.city && <span>{vendor.address ? ', ' : ''}{vendor.city}</span>}
                        {vendor.state && <span>, {vendor.state}</span>}
                        {vendor.zipCode && <span> {vendor.zipCode}</span>}
                      </span>
                    </td>
                  </tr>
                )}
                {vendor.licenseNumber && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">License</td>
                    <td className="px-3 py-2 flex items-center gap-1">
                      <Shield className="h-3 w-3 text-emerald-500" />
                      {vendor.licenseNumber}
                    </td>
                  </tr>
                )}
                {vendor.paymentTerms && (
                  <tr>
                    <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Payment</td>
                    <td className="px-3 py-2">{vendor.paymentTerms}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Contracts */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-700">Contracts</span>
                <span className="text-[10px] text-gray-500">{activeContracts}/{contracts.length}</span>
              </div>
              <button onClick={() => onTabChange?.('contracts')} className="text-[10px] text-blue-600 hover:underline">
                View all
              </button>
            </div>
            {contracts.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Contract</th>
                    <th className="px-3 py-1.5 text-right font-medium text-gray-600 w-24">Value</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-16">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.slice(0, 4).map((contract, idx) => (
                    <tr key={contract.id} className={`border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-1.5">
                        <Link href={`/dashboard/vendors/${vendor.id}/contracts/${contract.id}`} className="block">
                          <div className="truncate max-w-[150px]">{contract.contractNumber}</div>
                          <div className="text-[10px] text-gray-500">{getContractTypeLabel(contract.type)}</div>
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-right font-medium">
                        <Link href={`/dashboard/vendors/${vendor.id}/contracts/${contract.id}`} className="block">
                          {formatCurrency(contract.totalSum)}
                        </Link>
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Link href={`/dashboard/vendors/${vendor.id}/contracts/${contract.id}`} className="block">
                          {getStatusBadge(contract.status)}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">No contracts yet</div>
            )}
          </div>

          {/* Contacts */}
          {vendor.contacts?.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-semibold text-gray-700">Contacts</span>
                <span className="text-[10px] text-gray-500">{vendor.contacts.length}</span>
              </div>
              <div className="p-2 flex flex-wrap gap-1">
                {vendor.contacts.slice(0, 6).map((contact: any) => (
                  <div key={contact.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs">
                    <div className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-medium">
                      {contact.firstName?.[0]}{contact.lastName?.[0]}
                    </div>
                    <div>
                      <span className="text-gray-700">{contact.firstName} {contact.lastName?.[0]}.</span>
                      {contact.isPrimary && <span className="text-[9px] text-blue-600 ml-1">Primary</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Overdue Milestones Alert */}
          {overdueMilestones.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Overdue Milestones</span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {overdueMilestones.slice(0, 3).map((milestone: any, idx: number) => (
                    <tr key={milestone.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}`}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="truncate max-w-[180px]">{milestone.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-red-600 text-right w-20">{formatDate(milestone.targetDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Milestones */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-gray-700">Milestones</span>
                <span className="text-[10px] text-gray-500">{completedMilestones}/{milestones.length}</span>
              </div>
              <button onClick={() => onTabChange?.('milestones')} className="text-[10px] text-blue-600 hover:underline">
                View all
              </button>
            </div>
            {milestones.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Milestone</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600 w-20">Due</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-16">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.slice(0, 5).map((milestone: any, idx: number) => {
                    const isCompleted = milestone.status === 'COMPLETED'
                    const isOverdue = milestone.targetDate && new Date(milestone.targetDate) < new Date() && !isCompleted
                    return (
                      <tr key={milestone.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-1.5 truncate max-w-[150px]">{milestone.title}</td>
                        <td className={`px-3 py-1.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {formatDate(milestone.targetDate)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isCompleted ? (
                            <span className="inline-flex px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">Done</span>
                          ) : isOverdue ? (
                            <span className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Late</span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">Open</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">No milestones</div>
            )}
          </div>

          {/* Recent Files */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-cyan-600" />
                <span className="text-xs font-semibold text-gray-700">Recent Files</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="text-[10px] text-gray-600 hover:text-gray-800 flex items-center gap-0.5 disabled:opacity-50"
                >
                  <Upload className="h-3 w-3" />
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
                </button>
                <button onClick={() => onTabChange?.('files')} className="text-[10px] text-blue-600 hover:underline">
                  View all
                </button>
              </div>
            </div>
            {files.length > 0 ? (
              <table className="w-full text-xs">
                <tbody>
                  {files.slice(0, 4).map((file: any, idx: number) => (
                    <tr key={file.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-1.5 truncate max-w-[200px]">{file.name || file.fileName}</td>
                      <td className="px-3 py-1.5 text-gray-500 text-right w-20">{formatDate(file.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">No files uploaded</div>
            )}
          </div>

          {/* Recent Reviews */}
          {vendor.reviews?.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-gray-700">Recent Reviews</span>
                </div>
                <button onClick={() => onTabChange?.('reviews')} className="text-[10px] text-blue-600 hover:underline">
                  View all
                </button>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {vendor.reviews.slice(0, 3).map((review: any, idx: number) => (
                    <tr key={review.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center text-amber-500">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`h-2.5 w-2.5 ${star <= review.overallRating ? 'fill-current' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                          <span className="text-gray-600 truncate max-w-[120px]">{review.reviewerName}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 text-right w-20">{formatDate(review.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Projects - Full Width */}
      {vendor.projectVendors?.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-600" />
              <span className="text-xs font-semibold text-gray-700">Projects</span>
              <span className="text-[10px] text-gray-500">{vendor.projectVendors.length}</span>
            </div>
            <button onClick={() => onTabChange?.('projects')} className="text-[10px] text-blue-600 hover:underline">
              View all
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 p-2">
            {vendor.projectVendors.slice(0, 8).map((pv: any) => (
              <Link
                key={pv.id}
                href={`/dashboard/projects/${pv.project.id}`}
                className="px-3 py-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="text-xs font-medium text-gray-900 truncate">{pv.project.title}</div>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(pv.project.status)}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {vendor.notes && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-semibold text-gray-700">Notes</span>
          </div>
          <div className="px-3 py-2 text-xs text-gray-600 whitespace-pre-wrap">{vendor.notes}</div>
        </div>
      )}
    </div>
  )
}

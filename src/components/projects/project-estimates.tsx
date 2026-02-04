'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import { 
  Plus,
  Download,
  Eye,
  Send,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { generateEstimatePDF } from '@/lib/pdf-generator'
import { CompactFilters } from '@/components/ui/compact-filters'
import { useCurrency } from '@/hooks/useCurrency'

interface ProjectEstimatesProps {
  projectId: string
}

interface Project {
  title: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  projectAddress?: string
  projectCity?: string
  projectState?: string
  projectZipCode?: string
}

interface EstimateItem {
  id: string
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
  order: number
}

interface Estimate {
  id: string
  estimateNumber: string
  title: string
  description?: string
  subtotal: number
  tax: number
  discount: number
  total: number
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED'
  validUntil?: string
  sentAt?: string
  viewedAt?: string
  acceptedAt?: string
  rejectedAt?: string
  items: EstimateItem[]
  createdAt: string
  updatedAt: string
}

const estimateSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  description: Yup.string(),
  validUntil: Yup.date(),
  tax: Yup.number().min(0, 'Tax must be positive'),
  discount: Yup.number().min(0, 'Discount must be positive'),
  items: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required('Item name is required'),
      description: Yup.string(),
      quantity: Yup.number().positive('Quantity must be positive').required('Quantity is required'),
      unit: Yup.string().required('Unit is required'),
      unitPrice: Yup.number().positive('Unit price must be positive').required('Unit price is required')
    })
  ).min(1, 'At least one item is required')
})

async function fetchProjectEstimates(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/estimates`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch estimates')
  return response.json()
}

async function createEstimate(projectId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/estimates`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create estimate')
  return response.json()
}

async function updateEstimate(estimateId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/estimate/${estimateId}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update estimate')
  return response.json()
}

async function deleteEstimate(estimateId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/estimate/${estimateId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete estimate')
  return response.json()
}

async function fetchProject(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch project')
  return response.json()
}

export function ProjectEstimates({ projectId }: ProjectEstimatesProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { format: formatCurrency, symbol: currencySymbol, currency: currencyCode } = useCurrency()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedEstimate, setSelectedEstimate] = useState<Estimate | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ['project-estimates', projectId],
    queryFn: () => fetchProjectEstimates(projectId),
    enabled: !!projectId
  })

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId
  })

  // Handle estimate view from URL
  useEffect(() => {
    const estimateId = searchParams.get('estimate')
    if (estimateId && estimates.length > 0) {
      const estimate = estimates.find((est: Estimate) => est.id === estimateId)
      if (estimate) {
        setSelectedEstimate(estimate)
        setIsViewModalOpen(true)
      }
    }
  }, [searchParams, estimates])

  const createMutation = useMutation({
    mutationFn: (data: any) => createEstimate(projectId, data),
    onSuccess: () => {
      toast.success('Estimate created successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-estimates', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setIsAddModalOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create estimate')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ estimateId, data }: { estimateId: string, data: any }) => updateEstimate(estimateId, data),
    onSuccess: () => {
      toast.success('Estimate updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-estimates', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update estimate')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteEstimate,
    onSuccess: () => {
      toast.success('Estimate deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-estimates', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete estimate')
    }
  })

  const statuses = ['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED']

  // Filter estimates
  const filteredEstimates = estimates.filter((estimate: Estimate) => {
    const matchesSearch = estimate.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         estimate.estimateNumber.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || estimate.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })

  const statusColors = {
    DRAFT: 'bg-gray-100 text-gray-800',
    SENT: 'bg-blue-100 text-blue-800',
    VIEWED: 'bg-yellow-100 text-yellow-800',
    ACCEPTED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle className="h-4 w-4" />
      case 'REJECTED': return <XCircle className="h-4 w-4" />
      case 'SENT': case 'VIEWED': return <Clock className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const handleStatusChange = (estimateId: string, newStatus: string) => {
    const updateData = { status: newStatus }
    updateMutation.mutate({ estimateId, data: updateData })
  }

  const handleViewEstimate = (estimate: Estimate) => {
    setSelectedEstimate(estimate)
    setIsViewModalOpen(true)
    
    // Update URL to include estimate parameter
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('estimate', estimate.id)
    router.push(newUrl.pathname + newUrl.search, { scroll: false })
  }

  const handleCloseEstimate = () => {
    setIsViewModalOpen(false)
    setSelectedEstimate(null)
    
    // Remove estimate parameter from URL
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.delete('estimate')
    router.push(newUrl.pathname + newUrl.search, { scroll: false })
  }

  const handleDownloadPDF = (estimate: Estimate) => {
    if (!project) {
      toast.error('Project data not available')
      return
    }
    
    try {
      generateEstimatePDF(estimate, project, undefined, currencyCode)
      toast.success('PDF downloaded successfully!')
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast.error('Failed to generate PDF')
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with Action Button */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Estimates</h3>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700 flex items-center space-x-1 text-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Estimate</span>
          </button>
        </div>
      </div>

      {/* Compact Filters */}
      <CompactFilters
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search estimates..."
        resultsCount={filteredEstimates.length}
        filters={[
          {
            key: 'status',
            label: 'Status',
            value: selectedStatus,
            onChange: setSelectedStatus,
            options: [
              { value: 'all', label: 'All Status' },
              ...statuses.map(status => ({ value: status, label: status }))
            ]
          }
        ]}
      />

      {/* Estimates List - Compact */}
      <div className="space-y-2">
        {filteredEstimates.map((estimate: Estimate) => (
          <div 
            key={estimate.id} 
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-3 cursor-pointer"
            onClick={() => handleViewEstimate(estimate)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-sm font-semibold text-gray-900">{estimate.title}</h3>
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded-full ${statusColors[estimate.status]}`}>
                      {estimate.status}
                    </span>
                    <span className="text-xs text-gray-500">#{estimate.estimateNumber}</span>
                    {estimate.validUntil && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(estimate.validUntil).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-sm text-gray-500">
                      <span>{estimate.items.length} items</span>
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(estimate.total)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-1 ml-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleViewEstimate(estimate)
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  title="View"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDownloadPDF(estimate)
                  }}
                  className="text-gray-400 hover:text-blue-600 p-1"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteMutation.mutate(estimate.id)
                  }}
                  className="text-gray-400 hover:text-red-600 p-1"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEstimates.length === 0 && (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <div className="text-sm text-gray-500 mb-3">
            {searchTerm || selectedStatus !== 'all'
              ? 'No estimates match your filters'
              : 'No estimates found'}
          </div>
          {(!searchTerm && selectedStatus === 'all') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first estimate
            </button>
          )}
        </div>
      )}

      {/* Add Estimate Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAddModalOpen(false)} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    Create New Estimate
                  </h3>
                  
                  <Formik
                    initialValues={{
                      title: '',
                      description: '',
                      validUntil: '',
                      tax: 0,
                      discount: 0,
                      items: [
                        {
                          name: '',
                          description: '',
                          quantity: 1,
                          unit: 'each',
                          unitPrice: 0
                        }
                      ]
                    }}
                    validationSchema={estimateSchema}
                    onSubmit={(values) => {
                      const items = values.items.map((item, index) => ({
                        ...item,
                        total: item.quantity * item.unitPrice,
                        order: index
                      }))
                      
                      const subtotal = items.reduce((sum, item) => sum + item.total, 0)
                      const total = subtotal + values.tax - values.discount
                      
                      createMutation.mutate({
                        ...values,
                        items,
                        subtotal,
                        total
                      })
                    }}
                  >
                    {({ values, isSubmitting }) => (
                      <Form className="space-y-6">
                        {/* Basic Information */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                              Estimate Title *
                            </label>
                            <Field
                              id="title"
                              name="title"
                              type="text"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="e.g., Kitchen Renovation Estimate"
                            />
                            <ErrorMessage name="title" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="validUntil" className="block text-sm font-medium text-gray-700">
                              Valid Until
                            </label>
                            <Field
                              id="validUntil"
                              name="validUntil"
                              type="date"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <ErrorMessage name="validUntil" component="p" className="mt-1 text-sm text-red-600" />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <Field
                            as="textarea"
                            id="description"
                            name="description"
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Estimate details and scope..."
                          />
                          <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        {/* Line Items */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Line Items *
                          </label>
                          <FieldArray name="items">
                            {({ push, remove }) => (
                              <div className="space-y-3">
                                {values.items.map((_, index) => (
                                  <div key={index} className="grid grid-cols-12 gap-2 items-start">
                                    <div className="col-span-3">
                                      <Field
                                        name={`items[${index}].name`}
                                        placeholder="Item name"
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      />
                                      <ErrorMessage name={`items[${index}].name`} component="p" className="mt-1 text-xs text-red-600" />
                                    </div>
                                    <div className="col-span-2">
                                      <Field
                                        name={`items[${index}].quantity`}
                                        type="number"
                                        placeholder="Qty"
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      />
                                      <ErrorMessage name={`items[${index}].quantity`} component="p" className="mt-1 text-xs text-red-600" />
                                    </div>
                                    <div className="col-span-2">
                                      <Field
                                        name={`items[${index}].unit`}
                                        placeholder="Unit"
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      />
                                      <ErrorMessage name={`items[${index}].unit`} component="p" className="mt-1 text-xs text-red-600" />
                                    </div>
                                    <div className="col-span-2">
                                      <Field
                                        name={`items[${index}].unitPrice`}
                                        type="number"
                                        step="0.01"
                                        placeholder="Price"
                                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                      />
                                      <ErrorMessage name={`items[${index}].unitPrice`} component="p" className="mt-1 text-xs text-red-600" />
                                    </div>
                                    <div className="col-span-2">
                                      <div className="px-3 py-2 text-sm text-gray-900 font-medium">
                                        {formatCurrency((values.items[index]?.quantity || 0) * (values.items[index]?.unitPrice || 0))}
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      {values.items.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => remove(index)}
                                          className="text-red-400 hover:text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                
                                <button
                                  type="button"
                                  onClick={() => push({ name: '', description: '', quantity: 1, unit: 'each', unitPrice: 0 })}
                                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm"
                                >
                                  <Plus className="h-4 w-4" />
                                  <span>Add Item</span>
                                </button>
                              </div>
                            )}
                          </FieldArray>
                        </div>

                        {/* Totals */}
                        <div className="border-t pt-4">
                          <div className="grid grid-cols-2 gap-4 max-w-md ml-auto">
                            <div>
                              <label htmlFor="tax" className="block text-sm font-medium text-gray-700">
                                Tax Amount
                              </label>
                              <Field
                                id="tax"
                                name="tax"
                                type="number"
                                step="0.01"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                placeholder="0.00"
                              />
                              <ErrorMessage name="tax" component="p" className="mt-1 text-sm text-red-600" />
                            </div>

                            <div>
                              <label htmlFor="discount" className="block text-sm font-medium text-gray-700">
                                Discount Amount
                              </label>
                              <Field
                                id="discount"
                                name="discount"
                                type="number"
                                step="0.01"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                placeholder="0.00"
                              />
                              <ErrorMessage name="discount" component="p" className="mt-1 text-sm text-red-600" />
                            </div>
                          </div>

                          <div className="mt-4 text-right space-y-1">
                            <div className="text-sm text-gray-600">
                              Subtotal: {formatCurrency(values.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0))}
                            </div>
                            {values.tax > 0 && (
                              <div className="text-sm text-gray-600">
                                Tax: {formatCurrency(values.tax)}
                              </div>
                            )}
                            {values.discount > 0 && (
                              <div className="text-sm text-green-600">
                                Discount: -{formatCurrency(values.discount)}
                              </div>
                            )}
                            <div className="text-lg font-semibold text-gray-900">
                              Total: {formatCurrency(
                                values.items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) +
                                values.tax -
                                values.discount
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-6 border-t">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || createMutation.isPending}
                            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {createMutation.isPending ? 'Creating...' : 'Create Estimate'}
                          </button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Estimate Modal */}
      {isViewModalOpen && selectedEstimate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleCloseEstimate} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={handleCloseEstimate}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  {/* Header */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">{selectedEstimate.title}</h3>
                        <p className="text-sm text-gray-500">Estimate #{selectedEstimate.estimateNumber}</p>
                      </div>
                      <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full ${statusColors[selectedEstimate.status]}`}>
                        {getStatusIcon(selectedEstimate.status)}
                        <span className="ml-1">{selectedEstimate.status}</span>
                      </span>
                    </div>
                    
                    {selectedEstimate.description && (
                      <p className="text-gray-600 mb-4">{selectedEstimate.description}</p>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Created:</span>
                        <div className="font-medium">{new Date(selectedEstimate.createdAt).toLocaleDateString()}</div>
                      </div>
                      {selectedEstimate.validUntil && (
                        <div>
                          <span className="text-gray-500">Valid Until:</span>
                          <div className="font-medium">{new Date(selectedEstimate.validUntil).toLocaleDateString()}</div>
                        </div>
                      )}
                      {selectedEstimate.sentAt && (
                        <div>
                          <span className="text-gray-500">Sent:</span>
                          <div className="font-medium">{new Date(selectedEstimate.sentAt).toLocaleDateString()}</div>
                        </div>
                      )}
                      {selectedEstimate.acceptedAt && (
                        <div>
                          <span className="text-gray-500">Accepted:</span>
                          <div className="font-medium">{new Date(selectedEstimate.acceptedAt).toLocaleDateString()}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="mb-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Line Items</h4>
                    <div className="overflow-hidden border border-gray-200 rounded-lg">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedEstimate.items.map((item: EstimateItem) => (
                            <tr key={item.id}>
                              <td className="px-4 py-4">
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                {item.description && (
                                  <div className="text-sm text-gray-500">{item.description}</div>
                                )}
                              </td>
                              <td className="px-4 py-4 text-sm text-gray-900">{item.quantity}</td>
                              <td className="px-4 py-4 text-sm text-gray-900">{item.unit}</td>
                              <td className="px-4 py-4 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-4 py-4 text-sm font-medium text-gray-900">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4">
                    <div className="max-w-md ml-auto space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal:</span>
                        <span className="font-medium">{formatCurrency(selectedEstimate.subtotal)}</span>
                      </div>
                      {selectedEstimate.tax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Tax:</span>
                          <span className="font-medium">{formatCurrency(selectedEstimate.tax)}</span>
                        </div>
                      )}
                      {selectedEstimate.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Discount:</span>
                          <span className="font-medium text-green-600">-{formatCurrency(selectedEstimate.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-semibold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(selectedEstimate.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-6 border-t mt-6">
                    <select
                      value={selectedEstimate.status}
                      onChange={(e) => {
                        handleStatusChange(selectedEstimate.id, e.target.value)
                        setSelectedEstimate({ ...selectedEstimate, status: e.target.value as any })
                      }}
                      className="border border-gray-300 rounded px-3 py-2"
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    
                    <div className="flex space-x-3">
                      <button
                        onClick={handleCloseEstimate}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(selectedEstimate)}
                        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
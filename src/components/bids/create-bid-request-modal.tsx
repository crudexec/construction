'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { 
  X, 
  Upload, 
  File, 
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface CreateBidRequestModalProps {
  isOpen: boolean
  onClose: () => void
}

interface BidRequestFormData {
  title: string
  description: string
  location?: string
  timeline?: string
  requirements?: string
  deadline?: string
  budget?: number
}

interface BidRequestFormValues {
  title: string
  description: string
  location: string
  timeline: string
  requirements: string
  deadline: string
  budget: string
}

const bidRequestSchema = Yup.object().shape({
  title: Yup.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters')
    .required('Project title is required'),
  description: Yup.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters')
    .required('Project description is required'),
  location: Yup.string().max(200, 'Location must be less than 200 characters'),
  timeline: Yup.string().max(200, 'Timeline must be less than 200 characters'),
  requirements: Yup.string().max(1000, 'Requirements must be less than 1000 characters'),
  deadline: Yup.date().min(new Date(), 'Deadline must be in the future'),
  budget: Yup.string().matches(/^\d*\.?\d*$/, 'Budget must be a valid number')
})

async function createBidRequest(data: BidRequestFormData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/bid-requests', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create bid request')
  return response.json()
}

export function CreateBidRequestModal({ isOpen, onClose }: CreateBidRequestModalProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [createdBidRequest, setCreatedBidRequest] = useState<{ shareUrl: string; bidRequest: any } | null>(null)
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: createBidRequest,
    onSuccess: (data) => {
      toast.success('Bid request created successfully!')
      queryClient.invalidateQueries({ queryKey: ['bid-requests'] })
      setCreatedBidRequest(data)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create bid request')
    }
  })

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleClose = () => {
    setCreatedBidRequest(null)
    setUploadedFiles([])
    onClose()
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Share URL copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {createdBidRequest ? 'Bid Request Created!' : 'Create Bid Request'}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Success View */}
          {createdBidRequest ? (
            <div className="p-6">
              <div className="text-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Bid Request Created Successfully!
                </h4>
                <p className="text-gray-600">
                  Your bid request "{createdBidRequest.bidRequest.title}" is now live and ready to be shared.
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share this URL with contractors:
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={createdBidRequest.shareUrl}
                    readOnly
                    className="flex-1 bg-white border border-gray-300 rounded-md px-3 py-2 text-sm"
                  />
                  <button
                    onClick={() => copyToClipboard(createdBidRequest.shareUrl)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 flex items-center space-x-1"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h5 className="font-medium text-blue-900 mb-2">Next Steps:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Share the URL with contractors via email, text, or your preferred communication method</li>
                  <li>• Contractors can view project details and submit bids through the link</li>
                  <li>• Track submissions and views in your bids dashboard</li>
                  <li>• Review and compare bids when they start coming in</li>
                </ul>
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href="/dashboard/bids"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  onClick={handleClose}
                >
                  View All Bids
                </Link>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                >
                  Create Another
                </button>
              </div>
            </div>
          ) : (
            /* Form */
            <div className="p-6">
            <Formik
              initialValues={{
                title: '',
                description: '',
                location: '',
                timeline: '',
                requirements: '',
                deadline: '',
                budget: ''
              }}
              validationSchema={bidRequestSchema}
              onSubmit={(values, { setSubmitting }) => {
                // Convert empty strings to undefined for optional fields
                const cleanedValues = {
                  ...values,
                  location: values.location || undefined,
                  timeline: values.timeline || undefined,
                  requirements: values.requirements || undefined,
                  deadline: values.deadline || undefined,
                  budget: values.budget ? parseFloat(values.budget as string) : undefined
                }
                createMutation.mutate(cleanedValues)
                setSubmitting(false)
              }}
            >
              {({ isSubmitting, values, setFieldValue }) => (
                <Form className="space-y-6">
                  {/* Project Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Project Title *
                    </label>
                    <Field
                      id="title"
                      name="title"
                      type="text"
                      placeholder="e.g., Kitchen Renovation - 123 Main St"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <ErrorMessage name="title" component="p" className="mt-1 text-sm text-red-600" />
                  </div>

                  {/* Project Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Project Description *
                    </label>
                    <Field
                      as="textarea"
                      id="description"
                      name="description"
                      rows={4}
                      placeholder="Describe the project scope, materials needed, timeline expectations, and any specific requirements..."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
                  </div>

                  {/* Location */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      Project Location
                    </label>
                    <Field
                      id="location"
                      name="location"
                      type="text"
                      placeholder="e.g., 123 Main Street, City, State 12345"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <ErrorMessage name="location" component="p" className="mt-1 text-sm text-red-600" />
                  </div>

                  {/* Timeline and Budget Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="timeline" className="block text-sm font-medium text-gray-700 mb-1">
                        <Clock className="inline h-4 w-4 mr-1" />
                        Expected Timeline
                      </label>
                      <Field
                        id="timeline"
                        name="timeline"
                        type="text"
                        placeholder="e.g., 2-3 weeks, Start in January"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <ErrorMessage name="timeline" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                        <DollarSign className="inline h-4 w-4 mr-1" />
                        Budget Range
                      </label>
                      <Field
                        id="budget"
                        name="budget"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g., 15000"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <ErrorMessage name="budget" component="p" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  {/* Deadline */}
                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      Bid Submission Deadline
                    </label>
                    <Field
                      id="deadline"
                      name="deadline"
                      type="datetime-local"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <ErrorMessage name="deadline" component="p" className="mt-1 text-sm text-red-600" />
                    <p className="mt-1 text-xs text-gray-500">
                      Optional: Set a deadline for contractors to submit their bids
                    </p>
                  </div>

                  {/* Requirements */}
                  <div>
                    <label htmlFor="requirements" className="block text-sm font-medium text-gray-700 mb-1">
                      <FileText className="inline h-4 w-4 mr-1" />
                      Special Requirements
                    </label>
                    <Field
                      as="textarea"
                      id="requirements"
                      name="requirements"
                      rows={3}
                      placeholder="License requirements, insurance needs, certifications, material preferences, etc."
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                    <ErrorMessage name="requirements" component="p" className="mt-1 text-sm text-red-600" />
                  </div>

                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Upload className="inline h-4 w-4 mr-1" />
                      Project Documents
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.dwg"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center space-y-2"
                      >
                        <Upload className="h-8 w-8 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          Click to upload plans, specs, or reference materials
                        </span>
                        <span className="text-xs text-gray-500">
                          PDF, DOC, DOCX, JPG, PNG, DWG up to 10MB each
                        </span>
                      </label>
                    </div>

                    {/* Uploaded Files */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {uploadedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-2">
                              <File className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">{file.name}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info Notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-blue-800">How it works</h4>
                        <div className="mt-1 text-sm text-blue-700">
                          <ul className="list-disc list-inside space-y-1">
                            <li>A unique link will be generated for this bid request</li>
                            <li>Share this link with contractors you want to invite</li>
                            <li>Contractors can view details and submit their bids through the link</li>
                            <li>You can track views and submissions in the bids dashboard</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || createMutation.isPending}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50"
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create Bid Request'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
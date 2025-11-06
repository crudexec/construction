'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  Building,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  FileText,
  Upload,
  X,
  Download,
  Phone,
  Mail
} from 'lucide-react'
import { Formik, Form, Field, ErrorMessage, FieldArray } from 'formik'
import * as Yup from 'yup'
import toast from 'react-hot-toast'

interface BidRequest {
  id: string
  title: string
  description: string
  location?: string
  timeline?: string
  requirements?: string
  deadline?: string
  budget?: number
  daysRemaining?: number
  company: {
    name: string
    logo?: string
    email?: string
    phone?: string
  }
  documents: Array<{
    id: string
    name: string
    fileName: string
    url: string
    createdAt: string
  }>
}

const bidSchema = Yup.object().shape({
  companyName: Yup.string().required('Company name is required'),
  contactName: Yup.string().required('Contact name is required'),
  contactEmail: Yup.string().email('Invalid email').required('Email is required'),
  contactPhone: Yup.string(),
  licenseNumber: Yup.string(),
  insuranceInfo: Yup.string(),
  totalAmount: Yup.number().min(0, 'Amount must be positive'),
  notes: Yup.string(),
  timeline: Yup.string(),
  warranty: Yup.string(),
  paymentTerms: Yup.string()
})

export default function PublicBidPage() {
  const params = useParams()
  const token = params.token as string
  const [bidRequest, setBidRequest] = useState<BidRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [bidType, setBidType] = useState<'form' | 'upload'>('form')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchBidRequest()
  }, [token])

  const fetchBidRequest = async () => {
    try {
      const response = await fetch(`/api/bid/${token}`)
      if (!response.ok) {
        throw new Error('Bid request not found or expired')
      }
      const data = await response.json()
      setBidRequest(data.bidRequest)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load bid request')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      
      // Check file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only PDF and Word documents are allowed')
        return
      }
      
      setUploadedFile(file)
    }
  }

  const submitBid = async (values: any) => {
    try {
      let finalValues = { ...values }

      if (bidType === 'upload' && uploadedFile) {
        // In a real app, you'd upload the file to cloud storage first
        // For now, we'll just include the file info
        finalValues = {
          ...values,
          hasUploadedFile: true,
          fileName: uploadedFile.name,
          fileUrl: '/placeholder-file-url' // This would be the actual file URL
        }
      }

      const response = await fetch(`/api/bid/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalValues)
      })

      if (!response.ok) {
        throw new Error('Failed to submit bid')
      }

      setSubmitted(true)
      toast.success('Bid submitted successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit bid')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Bid Request Not Found</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Bid Submitted Successfully!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for your submission. The project owner will review your bid and contact you if selected.
          </p>
          <div className="text-sm text-gray-500">
            You can close this window now.
          </div>
        </div>
      </div>
    )
  }

  if (!bidRequest) return null

  // Check if deadline has passed
  const isExpired = bidRequest.deadline && new Date() > new Date(bidRequest.deadline)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {bidRequest.company.logo ? (
                  <img src={bidRequest.company.logo} alt={bidRequest.company.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building className="h-7 w-7 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{bidRequest.company.name}</h1>
                  <p className="text-sm text-gray-600">Request for Quote</p>
                </div>
              </div>
              {bidRequest.daysRemaining !== null && (
                <div className={`text-right ${bidRequest.daysRemaining < 0 ? 'text-red-600' : bidRequest.daysRemaining <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                  <p className="text-sm font-medium">
                    {bidRequest.daysRemaining < 0 ? 'Expired' : 
                     bidRequest.daysRemaining === 0 ? 'Due Today' : 
                     `${bidRequest.daysRemaining} days remaining`}
                  </p>
                  {bidRequest.deadline && (
                    <p className="text-xs">
                      Due: {new Date(bidRequest.deadline).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isExpired && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Bid Deadline Has Passed
                </h3>
                <p className="text-sm text-red-700 mt-1">
                  This bid request is no longer accepting submissions.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Project Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{bidRequest.title}</h2>
              <div className="prose prose-sm text-gray-600 mb-6">
                <p>{bidRequest.description}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bidRequest.location && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{bidRequest.location}</span>
                  </div>
                )}
                {bidRequest.timeline && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{bidRequest.timeline}</span>
                  </div>
                )}
                {bidRequest.budget && (
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>Budget: ${bidRequest.budget.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {bidRequest.requirements && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Requirements</h3>
                  <p className="text-sm text-gray-600">{bidRequest.requirements}</p>
                </div>
              )}
            </div>

            {/* Documents */}
            {bidRequest.documents.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Documents</h3>
                <div className="space-y-2">
                  {bidRequest.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            Added {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bid Submission Form */}
            {!isExpired && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Submit Your Bid</h3>
                
                {/* Bid Type Selection */}
                <div className="mb-6">
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setBidType('form')}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        bidType === 'form' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Fill Out Form
                    </button>
                    <button
                      onClick={() => setBidType('upload')}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        bidType === 'upload' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Upload Document
                    </button>
                  </div>
                </div>

                <Formik
                  initialValues={{
                    companyName: '',
                    contactName: '',
                    contactEmail: '',
                    contactPhone: '',
                    licenseNumber: '',
                    insuranceInfo: '',
                    totalAmount: '',
                    notes: '',
                    timeline: '',
                    warranty: '',
                    paymentTerms: '',
                    lineItems: []
                  }}
                  validationSchema={bidSchema}
                  onSubmit={submitBid}
                >
                  {({ isSubmitting, values, setFieldValue }) => (
                    <Form className="space-y-6">
                      {/* Company Information */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company Name *
                          </label>
                          <Field
                            name="companyName"
                            type="text"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Your Company Name"
                          />
                          <ErrorMessage name="companyName" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Contact Name *
                          </label>
                          <Field
                            name="contactName"
                            type="text"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Your Full Name"
                          />
                          <ErrorMessage name="contactName" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email *
                          </label>
                          <Field
                            name="contactEmail"
                            type="email"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="your@email.com"
                          />
                          <ErrorMessage name="contactEmail" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Phone
                          </label>
                          <Field
                            name="contactPhone"
                            type="tel"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="(555) 123-4567"
                          />
                          <ErrorMessage name="contactPhone" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            License Number
                          </label>
                          <Field
                            name="licenseNumber"
                            type="text"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="License #"
                          />
                          <ErrorMessage name="licenseNumber" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Insurance Info
                          </label>
                          <Field
                            name="insuranceInfo"
                            type="text"
                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="Insurance details"
                          />
                          <ErrorMessage name="insuranceInfo" component="p" className="mt-1 text-sm text-red-600" />
                        </div>
                      </div>

                      {bidType === 'form' && (
                        <>
                          {/* Pricing */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Total Bid Amount
                            </label>
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">$</span>
                              </div>
                              <Field
                                name="totalAmount"
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-full rounded-md border border-gray-300 pl-7 pr-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="0.00"
                              />
                            </div>
                            <ErrorMessage name="totalAmount" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          {/* Additional Details */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Timeline
                              </label>
                              <Field
                                name="timeline"
                                type="text"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., 4-6 weeks"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Warranty
                              </label>
                              <Field
                                name="warranty"
                                type="text"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., 1 year"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Terms
                              </label>
                              <Field
                                name="paymentTerms"
                                type="text"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g., 50% upfront"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {bidType === 'upload' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Bid Document
                          </label>
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                            <div className="text-center">
                              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <div className="text-sm text-gray-600">
                                <label htmlFor="file-upload" className="cursor-pointer text-blue-600 hover:text-blue-700">
                                  Click to upload
                                </label>
                                <span> or drag and drop</span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">PDF or Word documents up to 10MB</p>
                              <input
                                id="file-upload"
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileUpload}
                              />
                            </div>
                            {uploadedFile && (
                              <div className="mt-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                                <div className="flex items-center">
                                  <FileText className="h-5 w-5 text-blue-600 mr-2" />
                                  <span className="text-sm text-blue-900">{uploadedFile.name}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setUploadedFile(null)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Additional Notes
                        </label>
                        <Field
                          as="textarea"
                          name="notes"
                          rows={4}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Any additional information about your bid..."
                        />
                      </div>

                      {/* Submit Button */}
                      <div>
                        <button
                          type="submit"
                          disabled={isSubmitting || (bidType === 'upload' && !uploadedFile)}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed font-medium"
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit Bid'}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Company Contact */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-3">
                {bidRequest.company.email && (
                  <a 
                    href={`mailto:${bidRequest.company.email}`}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    {bidRequest.company.email}
                  </a>
                )}
                {bidRequest.company.phone && (
                  <a 
                    href={`tel:${bidRequest.company.phone}`}
                    className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {bidRequest.company.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Deadline Info */}
            {bidRequest.deadline && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Deadline</h3>
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <div>
                    <p>{new Date(bidRequest.deadline).toLocaleDateString()}</p>
                    <p className="text-xs">
                      {new Date(bidRequest.deadline).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
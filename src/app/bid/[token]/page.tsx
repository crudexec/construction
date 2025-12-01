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
  Mail,
  Plus,
  Trash2,
  Calculator
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
  paymentTerms: Yup.string(),
  lineItems: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required('Item name is required'),
      description: Yup.string(),
      quantity: Yup.number().positive('Quantity must be positive').required('Quantity is required'),
      unit: Yup.string().required('Unit is required'),
      unitPrice: Yup.number().positive('Unit price must be positive').required('Unit price is required')
    })
  )
})

export default function PublicBidPage() {
  const params = useParams()
  const token = params.token as string
  const [bidRequest, setBidRequest] = useState<BidRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  // Removed bidType state - only using detailed estimates now
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
      // Calculate totals from line items
      const subtotal = values.lineItems.reduce((sum: number, item: any) => 
        sum + (item.quantity * item.unitPrice), 0
      )
      const tax = values.tax || 0
      const discount = values.discount || 0
      const total = subtotal + tax - discount
      
      const finalValues = {
        ...values,
        subtotal,
        totalAmount: total,
        lineItems: JSON.stringify(values.lineItems) // Store as JSON for now
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex-1">
              <div className="flex items-center space-x-4 mb-4">
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
              
              {/* Contact and Deadline Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                {bidRequest.deadline && (
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    <div>
                      <span className={`font-medium ${bidRequest.daysRemaining !== null && bidRequest.daysRemaining !== undefined && bidRequest.daysRemaining < 0 ? 'text-red-600' : bidRequest.daysRemaining !== null && bidRequest.daysRemaining !== undefined && bidRequest.daysRemaining <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
                        {bidRequest.daysRemaining !== null && bidRequest.daysRemaining !== undefined && bidRequest.daysRemaining < 0 ? 'Expired' : 
                         bidRequest.daysRemaining === 0 ? 'Due Today' : 
                         bidRequest.daysRemaining !== null && bidRequest.daysRemaining !== undefined ? `${bidRequest.daysRemaining} days remaining` : 'Due: ' + new Date(bidRequest.deadline!).toLocaleDateString()}
                      </span>
                      <span className="text-gray-500 ml-2">
                        ({new Date(bidRequest.deadline!).toLocaleDateString()})
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div className="max-w-6xl mx-auto">
          {/* Project Details */}
          <div className="space-y-6">
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
                
                {/* Removed bid type selection - only using detailed estimates */}

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
                    tax: 0,
                    discount: 0,
                    lineItems: [
                      {
                        name: '',
                        description: '',
                        quantity: 1,
                        unit: 'each',
                        unitPrice: 0
                      }
                    ]
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

                      {/* Line Items Section - Always shown */}
                      <>
                          {/* Line Items Section */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <label className="text-sm font-medium text-gray-700 flex items-center">
                                <Calculator className="h-4 w-4 mr-2" />
                                Line Items
                              </label>
                            </div>
                            <FieldArray name="lineItems">
                              {({ push, remove }) => (
                                <div className="space-y-3">
                                  {values.lineItems?.map((_: any, index: number) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                      <div className="grid grid-cols-12 gap-2 items-start">
                                        <div className="col-span-4">
                                          <Field
                                            name={`lineItems[${index}].name`}
                                            placeholder="Item name"
                                            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <ErrorMessage name={`lineItems[${index}].name`} component="p" className="mt-1 text-xs text-red-600" />
                                        </div>
                                        <div className="col-span-2">
                                          <Field
                                            name={`lineItems[${index}].quantity`}
                                            type="number"
                                            placeholder="Qty"
                                            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <ErrorMessage name={`lineItems[${index}].quantity`} component="p" className="mt-1 text-xs text-red-600" />
                                        </div>
                                        <div className="col-span-2">
                                          <Field
                                            name={`lineItems[${index}].unit`}
                                            placeholder="Unit"
                                            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <ErrorMessage name={`lineItems[${index}].unit`} component="p" className="mt-1 text-xs text-red-600" />
                                        </div>
                                        <div className="col-span-2">
                                          <Field
                                            name={`lineItems[${index}].unitPrice`}
                                            type="number"
                                            step="0.01"
                                            placeholder="Price"
                                            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <ErrorMessage name={`lineItems[${index}].unitPrice`} component="p" className="mt-1 text-xs text-red-600" />
                                        </div>
                                        <div className="col-span-1">
                                          <div className="px-3 py-2 text-sm text-gray-900 font-medium">
                                            ${((values.lineItems?.[index]?.quantity || 0) * (values.lineItems?.[index]?.unitPrice || 0)).toFixed(2)}
                                          </div>
                                        </div>
                                        <div className="col-span-1">
                                          {values.lineItems && values.lineItems.length > 1 && (
                                            <button
                                              type="button"
                                              onClick={() => remove(index)}
                                              className="text-red-400 hover:text-red-600 p-2"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="mt-2">
                                        <Field
                                          name={`lineItems[${index}].description`}
                                          placeholder="Description (optional)"
                                          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        />
                                      </div>
                                    </div>
                                  ))}
                                  
                                  <button
                                    type="button"
                                    onClick={() => push({ name: '', description: '', quantity: 1, unit: 'each', unitPrice: 0 })}
                                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                                  >
                                    <Plus className="h-4 w-4" />
                                    <span>Add Item</span>
                                  </button>
                                </div>
                              )}
                            </FieldArray>
                          </div>

                          {/* Totals Section */}
                          <div className="border-t pt-4">
                            <div className="grid grid-cols-2 gap-4 max-w-md ml-auto">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Tax Amount
                                </label>
                                <Field
                                  name="tax"
                                  type="number"
                                  step="0.01"
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="0.00"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Discount Amount
                                </label>
                                <Field
                                  name="discount"
                                  type="number"
                                  step="0.01"
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  placeholder="0.00"
                                />
                              </div>
                            </div>

                            <div className="mt-4 text-right space-y-1">
                              <div className="text-sm text-gray-600">
                                Subtotal: ${values.lineItems?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0).toFixed(2) || '0.00'}
                              </div>
                              {values.tax > 0 && (
                                <div className="text-sm text-gray-600">
                                  Tax: ${(values.tax || 0).toFixed(2)}
                                </div>
                              )}
                              {values.discount > 0 && (
                                <div className="text-sm text-green-600">
                                  Discount: -${(values.discount || 0).toFixed(2)}
                                </div>
                              )}
                              <div className="text-lg font-semibold text-gray-900 pt-2 border-t">
                                Total: ${(
                                  (values.lineItems?.reduce((sum: number, item: any) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0) || 0) +
                                  (values.tax || 0) -
                                  (values.discount || 0)
                                ).toFixed(2)}
                              </div>
                            </div>
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

                      {/* Removed upload section - only using detailed estimates */}

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
                          disabled={isSubmitting}
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

          {/* Removed sidebar - contact info moved to header */}
        </div>
      </div>
    </div>
  )
}
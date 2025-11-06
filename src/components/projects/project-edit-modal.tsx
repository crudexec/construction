'use client'

import { useState } from 'react'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { X, Save, Calendar, DollarSign, MapPin, User, Phone, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProjectEditModalProps {
  project: any
  isOpen: boolean
  onClose: () => void
  onSave: (updatedProject: any) => void
}

const projectEditSchema = Yup.object().shape({
  title: Yup.string().required('Project title is required'),
  description: Yup.string(),
  contactName: Yup.string(),
  contactEmail: Yup.string().email('Invalid email format'),
  contactPhone: Yup.string(),
  projectAddress: Yup.string(),
  projectCity: Yup.string(),
  projectState: Yup.string(),
  projectZipCode: Yup.string(),
  projectSize: Yup.number().min(0, 'Project size must be positive'),
  projectSizeUnit: Yup.string(),
  budget: Yup.number().min(0, 'Budget must be positive'),
  timeline: Yup.string(),
  startDate: Yup.date(),
  endDate: Yup.date(),
  priority: Yup.string().oneOf(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: Yup.string().oneOf(['ACTIVE', 'COMPLETED', 'ARCHIVED', 'CANCELLED'])
})

export function ProjectEditModal({ project, isOpen, onClose, onSave }: ProjectEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (values: any) => {
    setIsSubmitting(true)
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        },
        body: JSON.stringify(values)
      })

      if (response.ok) {
        const updatedProject = await response.json()
        toast.success('Project updated successfully')
        onSave(updatedProject)
        onClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update project')
      }
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error('Failed to update project')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return ''
    return new Date(dateString).toISOString().split('T')[0]
  }

  const initialValues = {
    title: project.title || '',
    description: project.description || '',
    contactName: project.contactName || '',
    contactEmail: project.contactEmail || '',
    contactPhone: project.contactPhone || '',
    projectAddress: project.projectAddress || '',
    projectCity: project.projectCity || '',
    projectState: project.projectState || '',
    projectZipCode: project.projectZipCode || '',
    projectSize: project.projectSize || '',
    projectSizeUnit: project.projectSizeUnit || 'sq ft',
    budget: project.budget || '',
    timeline: project.timeline || '',
    startDate: formatDateForInput(project.startDate),
    endDate: formatDateForInput(project.endDate),
    priority: project.priority || 'MEDIUM',
    status: project.status || 'ACTIVE'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Save className="h-5 w-5 mr-2 text-primary-600" />
              Edit Project Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <Formik
            initialValues={initialValues}
            validationSchema={projectEditSchema}
            onSubmit={handleSubmit}
          >
            {({ values, setFieldValue }) => (
              <Form className="p-6 space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2">
                    Basic Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Project Title *
                      </label>
                      <Field
                        id="title"
                        name="title"
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="title" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div className="md:col-span-2">
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <Field
                        as="textarea"
                        id="description"
                        name="description"
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                        Priority
                      </label>
                      <Field
                        as="select"
                        id="priority"
                        name="priority"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </Field>
                    </div>

                    <div>
                      <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                        Status
                      </label>
                      <Field
                        as="select"
                        id="status"
                        name="status"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ARCHIVED">Archived</option>
                        <option value="CANCELLED">Cancelled</option>
                      </Field>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center">
                    <User className="h-4 w-4 mr-2" />
                    Contact Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="contactName" className="block text-sm font-medium text-gray-700">
                        Contact Name
                      </label>
                      <Field
                        id="contactName"
                        name="contactName"
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                        <Mail className="h-4 w-4 inline mr-1" />
                        Email
                      </label>
                      <Field
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="contactEmail" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                        <Phone className="h-4 w-4 inline mr-1" />
                        Phone
                      </label>
                      <Field
                        id="contactPhone"
                        name="contactPhone"
                        type="tel"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Project Location */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2" />
                    Project Location
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label htmlFor="projectAddress" className="block text-sm font-medium text-gray-700">
                        Address
                      </label>
                      <Field
                        id="projectAddress"
                        name="projectAddress"
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="projectCity" className="block text-sm font-medium text-gray-700">
                        City
                      </label>
                      <Field
                        id="projectCity"
                        name="projectCity"
                        type="text"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label htmlFor="projectState" className="block text-sm font-medium text-gray-700">
                          State
                        </label>
                        <Field
                          id="projectState"
                          name="projectState"
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="projectZipCode" className="block text-sm font-medium text-gray-700">
                          Zip Code
                        </label>
                        <Field
                          id="projectZipCode"
                          name="projectZipCode"
                          type="text"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Project Details
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                        Budget ($)
                      </label>
                      <Field
                        id="budget"
                        name="budget"
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="budget" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="projectSize" className="block text-sm font-medium text-gray-700">
                        Project Size
                      </label>
                      <Field
                        id="projectSize"
                        name="projectSize"
                        type="number"
                        min="0"
                        step="0.01"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                      <ErrorMessage name="projectSize" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="projectSizeUnit" className="block text-sm font-medium text-gray-700">
                        Size Unit
                      </label>
                      <Field
                        as="select"
                        id="projectSizeUnit"
                        name="projectSizeUnit"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="sq ft">Square Feet</option>
                        <option value="sq m">Square Meters</option>
                        <option value="acres">Acres</option>
                        <option value="units">Units</option>
                        <option value="floors">Floors</option>
                        <option value="rooms">Rooms</option>
                      </Field>
                    </div>

                    <div className="md:col-span-3">
                      <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">
                        Timeline Description
                      </label>
                      <Field
                        id="timeline"
                        name="timeline"
                        type="text"
                        placeholder="e.g., 6-8 weeks, 3 months, etc."
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Schedule */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900 border-b border-gray-200 pb-2 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <Field
                        id="startDate"
                        name="startDate"
                        type="date"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <Field
                        id="endDate"
                        name="endDate"
                        type="date"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 flex items-center"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  )
}
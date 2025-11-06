'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { X, Loader2, Calendar, FileText, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const projectSchema = Yup.object().shape({
  title: Yup.string().required('Project title is required'),
  description: Yup.string(),
  contactName: Yup.string(),
  contactEmail: Yup.string().email('Invalid email'),
  contactPhone: Yup.string(),
  projectAddress: Yup.string(),
  projectCity: Yup.string(),
  projectState: Yup.string(),
  projectZipCode: Yup.string(),
  budget: Yup.number().positive('Budget must be positive'),
  startDate: Yup.date(),
  endDate: Yup.date().min(Yup.ref('startDate'), 'End date must be after start date'),
  priority: Yup.string().required('Priority is required'),
})

async function createProject(data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/project', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create project')
  return response.json()
}

async function fetchTemplates() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/templates', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch templates')
  return response.json()
}

async function applyTemplate(templateId: string, projectData: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/templates/${templateId}/apply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(projectData)
  })
  if (!response.ok) throw new Error('Failed to apply template')
  return response.json()
}

export function AddProjectModal({ isOpen, onClose, onSuccess }: AddProjectModalProps) {
  const [useTemplate, setUseTemplate] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  
  const { data: templates } = useQuery({
    queryKey: ['templates'],
    queryFn: fetchTemplates,
    enabled: useTemplate
  })
  
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      toast.success('Project created successfully!')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create project')
    },
  })
  
  const applyTemplateMutation = useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: any }) => 
      applyTemplate(templateId, data),
    onSuccess: () => {
      toast.success('Project created from template successfully!')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to apply template')
    },
  })
  
  const handleSubmit = (values: any) => {
    if (useTemplate && selectedTemplate) {
      applyTemplateMutation.mutate({ templateId: selectedTemplate, data: values })
    } else {
      createMutation.mutate(values)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                Create New Project
              </h3>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useTemplate}
                      onChange={(e) => {
                        setUseTemplate(e.target.checked)
                        if (!e.target.checked) {
                          setSelectedTemplate(null)
                        }
                      }}
                      className="sr-only"
                    />
                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useTemplate ? 'bg-primary-600' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useTemplate ? 'translate-x-6' : 'translate-x-1'}`} />
                    </div>
                    <span className="ml-3 font-medium text-gray-700 flex items-center">
                      <Sparkles className="w-4 h-4 mr-1 text-primary-600" />
                      Use Template
                    </span>
                  </label>
                </div>
                
                {useTemplate && (
                  <div className="space-y-2">
                    {templates && templates.length > 0 ? (
                      <select
                        value={selectedTemplate || ''}
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Select a template...</option>
                        {templates.map((template: any) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                            {template.description && ` - ${template.description}`}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-600">
                        No templates available. Create templates from the Settings page.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <Formik
                initialValues={{
                  title: '',
                  description: '',
                  contactName: '',
                  contactEmail: '',
                  contactPhone: '',
                  projectAddress: '',
                  projectCity: '',
                  projectState: '',
                  projectZipCode: '',
                  budget: '',
                  startDate: '',
                  endDate: '',
                  priority: 'MEDIUM',
                }}
                validationSchema={projectSchema}
                onSubmit={handleSubmit}
              >
                {({ isSubmitting }) => (
                  <Form className="space-y-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900 border-b pb-2">
                        Basic Information
                      </h4>
                      
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                          Project Title *
                        </label>
                        <Field
                          id="title"
                          name="title"
                          type="text"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="e.g., Downtown Office Renovation"
                        />
                        <ErrorMessage name="title" component="p" className="mt-1 text-sm text-red-600" />
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
                          placeholder="Project details and scope..."
                        />
                        <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                            Priority *
                          </label>
                          <Field
                            as="select"
                            id="priority"
                            name="priority"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </Field>
                          <ErrorMessage name="priority" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                            Budget
                          </label>
                          <Field
                            id="budget"
                            name="budget"
                            type="number"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="50000"
                          />
                          <ErrorMessage name="budget" component="p" className="mt-1 text-sm text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* Client Information */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900 border-b pb-2">
                        Client Information
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
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="John Doe"
                          />
                          <ErrorMessage name="contactName" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <Field
                            id="contactEmail"
                            name="contactEmail"
                            type="email"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="john@company.com"
                          />
                          <ErrorMessage name="contactEmail" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
                            Phone
                          </label>
                          <Field
                            id="contactPhone"
                            name="contactPhone"
                            type="tel"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="(555) 123-4567"
                          />
                          <ErrorMessage name="contactPhone" component="p" className="mt-1 text-sm text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* Project Location */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900 border-b pb-2">
                        Project Location
                      </h4>
                      
                      <div>
                        <label htmlFor="projectAddress" className="block text-sm font-medium text-gray-700">
                          Address
                        </label>
                        <Field
                          id="projectAddress"
                          name="projectAddress"
                          type="text"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="123 Main St"
                        />
                        <ErrorMessage name="projectAddress" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="projectCity" className="block text-sm font-medium text-gray-700">
                            City
                          </label>
                          <Field
                            id="projectCity"
                            name="projectCity"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="New York"
                          />
                          <ErrorMessage name="projectCity" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="projectState" className="block text-sm font-medium text-gray-700">
                            State
                          </label>
                          <Field
                            id="projectState"
                            name="projectState"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="NY"
                          />
                          <ErrorMessage name="projectState" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="projectZipCode" className="block text-sm font-medium text-gray-700">
                            Zip Code
                          </label>
                          <Field
                            id="projectZipCode"
                            name="projectZipCode"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="10001"
                          />
                          <ErrorMessage name="projectZipCode" component="p" className="mt-1 text-sm text-red-600" />
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-4">
                      <h4 className="text-md font-medium text-gray-900 border-b pb-2">
                        Timeline
                      </h4>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                            Start Date
                          </label>
                          <Field
                            id="startDate"
                            name="startDate"
                            type="date"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                          <ErrorMessage name="startDate" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                            End Date
                          </label>
                          <Field
                            id="endDate"
                            name="endDate"
                            type="date"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                          <ErrorMessage name="endDate" component="p" className="mt-1 text-sm text-red-600" />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || createMutation.isPending || applyTemplateMutation.isPending || (useTemplate && !selectedTemplate)}
                        className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {(createMutation.isPending || applyTemplateMutation.isPending) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Project'
                        )}
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
  )
}
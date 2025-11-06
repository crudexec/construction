'use client'

import { useState } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { X, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

interface AddCardModalProps {
  isOpen: boolean
  onClose: () => void
  stageId?: string
}

const cardSchema = Yup.object().shape({
  title: Yup.string().required('Title is required'),
  contactName: Yup.string(),
  contactEmail: Yup.string().email('Invalid email'),
  contactPhone: Yup.string(),
  projectAddress: Yup.string(),
  budget: Yup.number().positive('Budget must be positive'),
  priority: Yup.string().required('Priority is required'),
  timeline: Yup.string(),
  description: Yup.string(),
})

async function createCard(data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/card', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create card')
  return response.json()
}

async function fetchStages() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/stage', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch stages')
  return response.json()
}

export function AddCardModal({ isOpen, onClose, stageId }: AddCardModalProps) {
  const queryClient = useQueryClient()
  
  const { data: stages = [] } = useQuery({
    queryKey: ['stages'],
    queryFn: fetchStages,
    enabled: !stageId && isOpen // Only fetch if stageId is not provided
  })
  
  const createMutation = useMutation({
    mutationFn: createCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('Lead created successfully!')
      onClose()
    },
    onError: () => {
      toast.error('Failed to create lead')
    },
  })

  if (!isOpen) return null

  const defaultStageId = stageId || (stages.length > 0 ? stages[0].id : '')

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
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
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Add New Lead
              </h3>
              
              <Formik
                initialValues={{
                  title: '',
                  contactName: '',
                  contactEmail: '',
                  contactPhone: '',
                  projectAddress: '',
                  budget: '',
                  priority: 'MEDIUM',
                  timeline: '',
                  description: '',
                  stageId: defaultStageId,
                }}
                validationSchema={cardSchema}
                onSubmit={(values) => createMutation.mutate(values)}
              >
                {({ isSubmitting }) => (
                  <Form className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Project Title *
                      </label>
                      <Field
                        id="title"
                        name="title"
                        type="text"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="e.g., Kitchen Renovation"
                      />
                      <ErrorMessage name="title" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
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

                    <div>
                      <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
                        Email
                      </label>
                      <Field
                        id="contactEmail"
                        name="contactEmail"
                        type="email"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="john@example.com"
                      />
                      <ErrorMessage name="contactEmail" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="projectAddress" className="block text-sm font-medium text-gray-700">
                        Project Address
                      </label>
                      <Field
                        id="projectAddress"
                        name="projectAddress"
                        type="text"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="123 Main St, City, State"
                      />
                      <ErrorMessage name="projectAddress" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                          Budget
                        </label>
                        <Field
                          id="budget"
                          name="budget"
                          type="number"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="25000"
                        />
                        <ErrorMessage name="budget" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

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
                    </div>

                    {!stageId && stages.length > 0 && (
                      <div>
                        <label htmlFor="stageId" className="block text-sm font-medium text-gray-700">
                          Stage *
                        </label>
                        <Field
                          as="select"
                          id="stageId"
                          name="stageId"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        >
                          {stages.map((stage: any) => (
                            <option key={stage.id} value={stage.id}>
                              {stage.name}
                            </option>
                          ))}
                        </Field>
                        <ErrorMessage name="stageId" component="p" className="mt-1 text-sm text-red-600" />
                      </div>
                    )}

                    <div>
                      <label htmlFor="timeline" className="block text-sm font-medium text-gray-700">
                        Timeline
                      </label>
                      <Field
                        id="timeline"
                        name="timeline"
                        type="text"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="e.g., 2-3 weeks"
                      />
                      <ErrorMessage name="timeline" component="p" className="mt-1 text-sm text-red-600" />
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
                        placeholder="Project details..."
                      />
                      <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || createMutation.isPending}
                        className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Lead'
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
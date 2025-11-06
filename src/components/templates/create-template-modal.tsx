'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Formik, Form, Field, FieldArray } from 'formik'
import * as Yup from 'yup'
import { 
  X, 
  Loader2, 
  Plus, 
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  ListTodo,
  DollarSign,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const templateSchema = Yup.object().shape({
  name: Yup.string().required('Template name is required'),
  description: Yup.string(),
  icon: Yup.string(),
  title: Yup.string(),
  projectDescription: Yup.string(),
  priority: Yup.string(),
  taskCategories: Yup.array().of(
    Yup.object().shape({
      name: Yup.string().required('Category name is required'),
      color: Yup.string(),
      tasks: Yup.array().of(
        Yup.object().shape({
          title: Yup.string().required('Task title is required'),
          priority: Yup.string()
        })
      )
    })
  )
})

async function createTemplate(data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/templates', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create template')
  return response.json()
}

const defaultCategories = [
  {
    name: 'Planning & Design',
    color: '#6366f1',
    order: 0,
    tasks: [
      { title: 'Initial site assessment', priority: 'HIGH', daysFromStart: 0 },
      { title: 'Create project blueprint', priority: 'HIGH', daysFromStart: 2 },
      { title: 'Review with client', priority: 'MEDIUM', daysFromStart: 5 }
    ]
  },
  {
    name: 'Permits & Approvals',
    color: '#10b981',
    order: 1,
    tasks: [
      { title: 'Submit permit application', priority: 'HIGH', daysFromStart: 7 },
      { title: 'Schedule inspections', priority: 'MEDIUM', daysFromStart: 14 }
    ]
  },
  {
    name: 'Construction',
    color: '#f59e0b',
    order: 2,
    tasks: [
      { title: 'Site preparation', priority: 'HIGH', daysFromStart: 21 },
      { title: 'Foundation work', priority: 'HIGH', daysFromStart: 25 },
      { title: 'Framing', priority: 'HIGH', daysFromStart: 35 }
    ]
  }
]

export function CreateTemplateModal({ isOpen, onClose, onSuccess }: CreateTemplateModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'tasks' | 'budget' | 'folders'>('basic')
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set())
  
  const createMutation = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      toast.success('Template created successfully!')
      onSuccess()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create template')
    },
  })
  
  const toggleCategory = (index: number) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedCategories(newExpanded)
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
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
                Create Project Template
              </h3>
              
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'basic', label: 'Basic Info', icon: Info },
                    { id: 'tasks', label: 'Tasks & Categories', icon: ListTodo },
                    { id: 'budget', label: 'Budget Items', icon: DollarSign },
                    { id: 'folders', label: 'Folder Structure', icon: Folder }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`
                        flex items-center py-2 px-1 border-b-2 font-medium text-sm
                        ${activeTab === tab.id
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                      `}
                    >
                      <tab.icon className="w-4 h-4 mr-2" />
                      {tab.label}
                    </button>
                  ))}
                </nav>
              </div>
              
              <Formik
                initialValues={{
                  name: '',
                  description: '',
                  icon: 'building',
                  title: '',
                  projectDescription: '',
                  contactName: '',
                  contactEmail: '',
                  contactPhone: '',
                  projectAddress: '',
                  projectCity: '',
                  projectState: '',
                  projectZipCode: '',
                  projectSize: '',
                  projectSizeUnit: 'sqft',
                  budget: '',
                  timeline: '',
                  priority: 'MEDIUM',
                  taskCategories: defaultCategories,
                  budgetItems: [
                    { name: 'Materials', category: 'Construction', amount: 25000, quantity: 1, unit: 'lot', isExpense: true },
                    { name: 'Labor', category: 'Construction', amount: 35000, quantity: 1, unit: 'project', isExpense: true },
                    { name: 'Equipment Rental', category: 'Equipment', amount: 5000, quantity: 1, unit: 'project', isExpense: true }
                  ],
                  folders: [
                    { name: 'Documents', color: '#6366f1', children: [
                      { name: 'Contracts', color: '#6366f1' },
                      { name: 'Permits', color: '#10b981' },
                      { name: 'Invoices', color: '#f59e0b' }
                    ]},
                    { name: 'Plans & Drawings', color: '#ec4899' },
                    { name: 'Photos', color: '#8b5cf6', children: [
                      { name: 'Before', color: '#8b5cf6' },
                      { name: 'Progress', color: '#8b5cf6' },
                      { name: 'After', color: '#8b5cf6' }
                    ]}
                  ]
                }}
                validationSchema={templateSchema}
                onSubmit={(values) => createMutation.mutate(values)}
              >
                {({ values, isSubmitting }) => (
                  <Form className="space-y-6">
                    {activeTab === 'basic' && (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Template Name *
                          </label>
                          <Field
                            id="name"
                            name="name"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Residential Renovation"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Template Description
                          </label>
                          <Field
                            as="textarea"
                            id="description"
                            name="description"
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Describe what this template is for..."
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="icon" className="block text-sm font-medium text-gray-700">
                              Icon
                            </label>
                            <Field
                              as="select"
                              id="icon"
                              name="icon"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="building">Building</option>
                              <option value="home">Home</option>
                              <option value="wrench">Wrench</option>
                              <option value="hammer">Hammer</option>
                              <option value="hardhat">Hard Hat</option>
                              <option value="palette">Palette</option>
                            </Field>
                          </div>
                          
                          <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                              Default Priority
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
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Default Project Title
                          </label>
                          <Field
                            id="title"
                            name="title"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Leave blank to use template name"
                          />
                        </div>
                      </div>
                    )}
                    
                    {activeTab === 'tasks' && (
                      <div className="space-y-4">
                        <FieldArray name="taskCategories">
                          {({ push, remove }) => (
                            <>
                              {values.taskCategories.map((category, catIndex) => (
                                <div key={catIndex} className="border border-gray-200 rounded-lg">
                                  <div className="p-4 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                      <button
                                        type="button"
                                        onClick={() => toggleCategory(catIndex)}
                                        className="flex items-center space-x-2"
                                      >
                                        {expandedCategories.has(catIndex) ? (
                                          <ChevronDown className="w-4 h-4" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4" />
                                        )}
                                        <Field
                                          name={`taskCategories.${catIndex}.name`}
                                          className="font-medium text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none"
                                          placeholder="Category name"
                                        />
                                      </button>
                                      <div className="flex items-center space-x-2">
                                        <Field
                                          name={`taskCategories.${catIndex}.color`}
                                          type="color"
                                          className="w-8 h-8 rounded cursor-pointer"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => remove(catIndex)}
                                          className="text-red-600 hover:text-red-800"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {expandedCategories.has(catIndex) && (
                                    <div className="p-4">
                                      <FieldArray name={`taskCategories.${catIndex}.tasks`}>
                                        {({ push: pushTask, remove: removeTask }) => (
                                          <>
                                            {category.tasks.map((task, taskIndex) => (
                                              <div key={taskIndex} className="flex items-center space-x-2 mb-2">
                                                <Field
                                                  name={`taskCategories.${catIndex}.tasks.${taskIndex}.title`}
                                                  className="flex-1 px-3 py-1 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                  placeholder="Task title"
                                                />
                                                <Field
                                                  as="select"
                                                  name={`taskCategories.${catIndex}.tasks.${taskIndex}.priority`}
                                                  className="px-3 py-1 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                >
                                                  <option value="LOW">Low</option>
                                                  <option value="MEDIUM">Medium</option>
                                                  <option value="HIGH">High</option>
                                                  <option value="URGENT">Urgent</option>
                                                </Field>
                                                <Field
                                                  name={`taskCategories.${catIndex}.tasks.${taskIndex}.daysFromStart`}
                                                  type="number"
                                                  className="w-20 px-3 py-1 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                                  placeholder="Days"
                                                  title="Days from project start"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => removeTask(taskIndex)}
                                                  className="text-red-600 hover:text-red-800"
                                                >
                                                  <Trash2 className="w-4 h-4" />
                                                </button>
                                              </div>
                                            ))}
                                            <button
                                              type="button"
                                              onClick={() => pushTask({
                                                title: '',
                                                description: '',
                                                priority: 'MEDIUM',
                                                daysFromStart: 0
                                              })}
                                              className="mt-2 text-sm text-primary-600 hover:text-primary-800"
                                            >
                                              + Add Task
                                            </button>
                                          </>
                                        )}
                                      </FieldArray>
                                    </div>
                                  )}
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => push({
                                  name: '',
                                  color: '#6366f1',
                                  order: values.taskCategories.length,
                                  tasks: []
                                })}
                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                              >
                                + Add Category
                              </button>
                            </>
                          )}
                        </FieldArray>
                      </div>
                    )}
                    
                    {activeTab === 'budget' && (
                      <div className="space-y-4">
                        <FieldArray name="budgetItems">
                          {({ push, remove }) => (
                            <>
                              {values.budgetItems.map((item, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <Field
                                    name={`budgetItems.${index}.name`}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Item name"
                                  />
                                  <Field
                                    name={`budgetItems.${index}.category`}
                                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Category"
                                  />
                                  <Field
                                    name={`budgetItems.${index}.amount`}
                                    type="number"
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Amount"
                                  />
                                  <Field
                                    name={`budgetItems.${index}.quantity`}
                                    type="number"
                                    className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Qty"
                                  />
                                  <Field
                                    name={`budgetItems.${index}.unit`}
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-md focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    placeholder="Unit"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => remove(index)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                type="button"
                                onClick={() => push({
                                  name: '',
                                  category: '',
                                  amount: 0,
                                  quantity: 1,
                                  unit: '',
                                  isExpense: true
                                })}
                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                              >
                                + Add Budget Item
                              </button>
                            </>
                          )}
                        </FieldArray>
                      </div>
                    )}
                    
                    {activeTab === 'folders' && (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600 mb-4">
                          Define the folder structure that will be created for projects using this template.
                        </div>
                        <div className="space-y-2">
                          {values.folders.map((folder, index) => (
                            <div key={index} className="border-l-2 border-gray-200 pl-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <Folder className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{folder.name}</span>
                                <div
                                  className="w-4 h-4 rounded"
                                  style={{ backgroundColor: folder.color }}
                                />
                              </div>
                              {folder.children && folder.children.length > 0 && (
                                <div className="ml-4 space-y-1">
                                  {folder.children.map((child, childIndex) => (
                                    <div key={childIndex} className="flex items-center space-x-2">
                                      <Folder className="w-3 h-3 text-gray-400" />
                                      <span className="text-sm">{child.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
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
                        disabled={isSubmitting || createMutation.isPending}
                        className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                      >
                        {createMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Create Template'
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
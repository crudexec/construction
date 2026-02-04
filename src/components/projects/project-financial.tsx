'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import {
  DollarSign,
  Plus,
  TrendingUp,
  TrendingDown,
  PieChart,
  Calculator,
  Edit,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

interface ProjectFinancialProps {
  projectId: string
  project: any
}

interface BudgetItem {
  id: string
  name: string
  description?: string
  category: string
  amount: number
  quantity: number
  unit?: string
  isExpense: boolean
  isPaid: boolean
  paidAt?: string
  createdAt: string
  updatedAt: string
}

const budgetItemSchema = Yup.object().shape({
  name: Yup.string().required('Name is required'),
  description: Yup.string(),
  category: Yup.string().required('Category is required'),
  amount: Yup.number().positive('Amount must be positive').required('Amount is required'),
  quantity: Yup.number().positive('Quantity must be positive').required('Quantity is required'),
  unit: Yup.string(),
  isExpense: Yup.boolean().required()
})

async function fetchBudgetItems(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/budget`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch budget items')
  return response.json()
}

async function createBudgetItem(projectId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/budget`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create budget item')
  return response.json()
}

async function updateBudgetItem(itemId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/budget/${itemId}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update budget item')
  return response.json()
}

async function deleteBudgetItem(itemId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/budget/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete budget item')
  return response.json()
}

export function ProjectFinancial({ projectId, project }: ProjectFinancialProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [viewType, setViewType] = useState<'budget' | 'expenses'>('budget')
  const queryClient = useQueryClient()
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency()

  const { data: budgetItems = [], isLoading } = useQuery({
    queryKey: ['budget-items', projectId],
    queryFn: () => fetchBudgetItems(projectId),
    enabled: !!projectId
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createBudgetItem(projectId, data),
    onSuccess: () => {
      toast.success('Budget item created successfully!')
      queryClient.invalidateQueries({ queryKey: ['budget-items', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setIsModalOpen(false)
      setEditingItem(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create budget item')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ itemId, data }: { itemId: string, data: any }) => updateBudgetItem(itemId, data),
    onSuccess: () => {
      toast.success('Budget item updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['budget-items', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setIsModalOpen(false)
      setEditingItem(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update budget item')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBudgetItem,
    onSuccess: () => {
      toast.success('Budget item deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['budget-items', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete budget item')
    }
  })

  // Calculate financial metrics
  const budgetPlanned = budgetItems
    .filter((item: BudgetItem) => !item.isExpense)
    .reduce((sum: number, item: BudgetItem) => sum + (item.amount * item.quantity), 0)

  const expenses = budgetItems
    .filter((item: BudgetItem) => item.isExpense)
    .reduce((sum: number, item: BudgetItem) => sum + (item.amount * item.quantity), 0)

  const paidExpenses = budgetItems
    .filter((item: BudgetItem) => item.isExpense && item.isPaid)
    .reduce((sum: number, item: BudgetItem) => sum + (item.amount * item.quantity), 0)

  const unpaidExpenses = expenses - paidExpenses
  const totalBudget = project.budget || budgetPlanned
  const remainingBudget = totalBudget - expenses
  const budgetUsedPercentage = totalBudget > 0 ? (expenses / totalBudget) * 100 : 0

  const filteredItems = budgetItems.filter((item: BudgetItem) => 
    viewType === 'budget' ? !item.isExpense : item.isExpense
  )

  // Group items by category
  const itemsByCategory = filteredItems.reduce((acc: { [key: string]: BudgetItem[] }, item: BudgetItem) => {
    if (!acc[item.category]) {
      acc[item.category] = []
    }
    acc[item.category].push(item)
    return acc
  }, {})

  const categories = Object.keys(itemsByCategory)

  const getBudgetStatus = () => {
    if (budgetUsedPercentage > 100) return { color: 'text-red-600', icon: AlertTriangle, label: 'Over Budget' }
    if (budgetUsedPercentage > 90) return { color: 'text-orange-600', icon: TrendingUp, label: 'Near Limit' }
    if (budgetUsedPercentage > 75) return { color: 'text-yellow-600', icon: TrendingUp, label: 'On Track' }
    return { color: 'text-green-600', icon: TrendingDown, label: 'Under Budget' }
  }

  const budgetStatus = getBudgetStatus()
  const StatusIcon = budgetStatus.icon

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Budget</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(expenses)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Remaining Budget</p>
              <p className={`text-2xl font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(remainingBudget)}
              </p>
            </div>
            <Calculator className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Budget Used</p>
              <p className={`text-2xl font-semibold ${budgetStatus.color}`}>
                {budgetUsedPercentage.toFixed(1)}%
              </p>
              <p className={`text-xs ${budgetStatus.color}`}>{budgetStatus.label}</p>
            </div>
            <StatusIcon className={`h-8 w-8 ${budgetStatus.color.replace('text-', 'text-')}`} />
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Budget Progress</h3>
          <div className="text-sm text-gray-500">
            {formatCurrency(expenses)} of {formatCurrency(totalBudget)}
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all duration-300 ${
              budgetUsedPercentage > 100 ? 'bg-red-500' :
              budgetUsedPercentage > 90 ? 'bg-orange-500' :
              budgetUsedPercentage > 75 ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
          />
        </div>
        {budgetUsedPercentage > 100 && (
          <p className="text-sm text-red-600 mt-2 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-1" />
            Project is {formatCurrency(expenses - totalBudget)} over budget
          </p>
        )}
      </div>

      {/* Expense Summary */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Expense Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-red-700">Paid Expenses</span>
              <span className="text-lg font-semibold text-red-800">
                {formatCurrency(paidExpenses)}
              </span>
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-700">Unpaid Expenses</span>
              <span className="text-lg font-semibold text-orange-800">
                {formatCurrency(unpaidExpenses)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setViewType('budget')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewType === 'budget'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Budget Items ({budgetItems.filter((item: BudgetItem) => !item.isExpense).length})
        </button>
        <button
          onClick={() => setViewType('expenses')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            viewType === 'expenses'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Expenses ({budgetItems.filter((item: BudgetItem) => item.isExpense).length})
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">
            {viewType === 'budget' ? 'Budget Items' : 'Expenses'}
          </h3>
          <button
            onClick={() => {
              setEditingItem(null)
              setIsModalOpen(true)
            }}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add {viewType === 'budget' ? 'Budget Item' : 'Expense'}</span>
          </button>
        </div>

        {categories.map(category => (
          <div key={category} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-md font-medium text-gray-900">{category}</h4>
              <p className="text-sm text-gray-500">
                {formatCurrency(itemsByCategory[category].reduce((sum: number, item: BudgetItem) =>
                  sum + (item.amount * item.quantity), 0
                ))} total
              </p>
            </div>
            <div className="divide-y divide-gray-200">
              {itemsByCategory[category].map((item: BudgetItem) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h5 className="text-sm font-medium text-gray-900">{item.name}</h5>
                      {item.isExpense && (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>
                        {item.quantity} {item.unit || 'units'} × {formatCurrency(item.amount)}
                      </span>
                      <span className="font-medium">
                        = {formatCurrency(item.amount * item.quantity)}
                      </span>
                      {item.isPaid && item.paidAt && (
                        <span>Paid {new Date(item.paidAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingItem(item)
                        setIsModalOpen(true)
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(item.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <PieChart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {viewType === 'budget' ? 'budget items' : 'expenses'} yet
            </h3>
            <p className="text-gray-500 mb-4">
              Start by adding your first {viewType === 'budget' ? 'budget item' : 'expense'} to track project finances.
            </p>
            <button
              onClick={() => {
                setEditingItem(null)
                setIsModalOpen(true)
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Add {viewType === 'budget' ? 'Budget Item' : 'Expense'}
            </button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsModalOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    {editingItem ? 'Edit' : 'Add'} {viewType === 'budget' ? 'Budget Item' : 'Expense'}
                  </h3>
                  
                  <Formik
                    initialValues={{
                      name: editingItem?.name || '',
                      description: editingItem?.description || '',
                      category: editingItem?.category || '',
                      amount: editingItem?.amount || 0,
                      quantity: editingItem?.quantity || 1,
                      unit: editingItem?.unit || '',
                      isExpense: editingItem?.isExpense ?? (viewType === 'expenses'),
                      isPaid: editingItem?.isPaid || false
                    }}
                    validationSchema={budgetItemSchema}
                    onSubmit={(values) => {
                      if (editingItem) {
                        updateMutation.mutate({ itemId: editingItem.id, data: values })
                      } else {
                        createMutation.mutate(values)
                      }
                    }}
                  >
                    {({ isSubmitting, values }) => (
                      <Form className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Name *
                          </label>
                          <Field
                            id="name"
                            name="name"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Materials, Labor, Equipment"
                          />
                          <ErrorMessage name="name" component="p" className="mt-1 text-sm text-red-600" />
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
                            placeholder="Optional description..."
                          />
                          <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Category *
                          </label>
                          <Field
                            id="category"
                            name="category"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Materials, Labor, Equipment, Permits"
                          />
                          <ErrorMessage name="category" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                              Quantity *
                            </label>
                            <Field
                              id="quantity"
                              name="quantity"
                              type="number"
                              min="0"
                              step="0.01"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <ErrorMessage name="quantity" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                              Unit
                            </label>
                            <Field
                              id="unit"
                              name="unit"
                              type="text"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="e.g., hours, sq ft"
                            />
                            <ErrorMessage name="unit" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                              Unit Price * ({currencySymbol})
                            </label>
                            <Field
                              id="amount"
                              name="amount"
                              type="number"
                              min="0"
                              step="0.01"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <ErrorMessage name="amount" component="p" className="mt-1 text-sm text-red-600" />
                          </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            Total: <span className="font-semibold">
                              {formatCurrency((values.quantity || 0) * (values.amount || 0))}
                            </span>
                          </p>
                        </div>

                        <div className="flex items-center space-x-4">
                          <label className="flex items-center">
                            <Field
                              type="checkbox"
                              name="isExpense"
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">This is an expense</span>
                          </label>

                          {values.isExpense && (
                            <label className="flex items-center">
                              <Field
                                type="checkbox"
                                name="isPaid"
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">Mark as paid</span>
                            </label>
                          )}
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {isSubmitting || createMutation.isPending || updateMutation.isPending 
                              ? 'Saving...' 
                              : editingItem ? 'Update' : 'Create'
                            }
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
    </div>
  )
}
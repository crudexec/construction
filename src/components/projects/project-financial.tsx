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
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Check
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

type SortColumn = 'name' | 'category' | 'quantity' | 'amount' | 'total' | 'isPaid' | null
type SortDirection = 'asc' | 'desc'

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
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const queryClient = useQueryClient()
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency()

  const { data: budgetItems = [], isLoading } = useQuery({
    queryKey: ['budget-items', projectId],
    queryFn: () => fetchBudgetItems(projectId),
    enabled: !!projectId
  })

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => createBudgetItem(projectId, data),
    onSuccess: () => {
      toast.success('Budget item created')
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
      toast.success('Budget item updated')
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
      toast.success('Budget item deleted')
      queryClient.invalidateQueries({ queryKey: ['budget-items', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete budget item')
    }
  })

  const togglePaid = (item: BudgetItem) => {
    updateMutation.mutate({
      itemId: item.id,
      data: { isPaid: !item.isPaid, paidAt: !item.isPaid ? new Date().toISOString() : null }
    })
  }

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

  // Sort items
  const sortedItems = [...filteredItems].sort((a: BudgetItem, b: BudgetItem) => {
    if (!sortColumn) {
      return a.category.localeCompare(b.category)
    }

    const multiplier = sortDirection === 'asc' ? 1 : -1

    switch (sortColumn) {
      case 'name':
        return a.name.localeCompare(b.name) * multiplier
      case 'category':
        return a.category.localeCompare(b.category) * multiplier
      case 'quantity':
        return (a.quantity - b.quantity) * multiplier
      case 'amount':
        return (a.amount - b.amount) * multiplier
      case 'total':
        return ((a.amount * a.quantity) - (b.amount * b.quantity)) * multiplier
      case 'isPaid':
        return ((a.isPaid ? 1 : 0) - (b.isPaid ? 1 : 0)) * multiplier
      default:
        return a.category.localeCompare(b.category)
    }
  })

  const budgetItemCount = budgetItems.filter((item: BudgetItem) => !item.isExpense).length
  const expenseItemCount = budgetItems.filter((item: BudgetItem) => item.isExpense).length

  const getBudgetStatusColor = () => {
    if (budgetUsedPercentage > 100) return 'text-red-400'
    if (budgetUsedPercentage > 90) return 'text-amber-400'
    if (budgetUsedPercentage > 75) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Header Stats Bar */}
      <div className="bg-slate-800 rounded-lg p-2.5 text-white">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-slate-100">{formatCurrency(totalBudget)}</div>
            <div className="text-[10px] text-slate-400 uppercase">Budget</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-red-400">{formatCurrency(expenses)}</div>
            <div className="text-[10px] text-slate-400 uppercase">Spent</div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(remainingBudget)}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Remaining</div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${getBudgetStatusColor()}`}>
              {budgetUsedPercentage.toFixed(0)}%
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Used</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-emerald-400">{formatCurrency(paidExpenses)}</div>
            <div className="text-[10px] text-slate-400 uppercase">Paid</div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${unpaidExpenses > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {formatCurrency(unpaidExpenses)}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Unpaid</div>
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-20">Progress</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                budgetUsedPercentage > 100 ? 'bg-red-500' :
                budgetUsedPercentage > 90 ? 'bg-orange-500' :
                budgetUsedPercentage > 75 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 w-24 text-right">
            {formatCurrency(expenses)} / {formatCurrency(totalBudget)}
          </span>
        </div>
        {budgetUsedPercentage > 100 && (
          <div className="text-[10px] text-red-600 mt-1 flex items-center gap-1 pl-20">
            <AlertTriangle className="h-3 w-3" />
            Over budget by {formatCurrency(expenses - totalBudget)}
          </div>
        )}
      </div>

      {/* Tab Navigation & Add Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex bg-gray-100 p-0.5 rounded">
          <button
            onClick={() => setViewType('budget')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewType === 'budget'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Budget ({budgetItemCount})
          </button>
          <button
            onClick={() => setViewType('expenses')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewType === 'expenses'
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Expenses ({expenseItemCount})
          </button>
        </div>
        <button
          onClick={() => {
            setEditingItem(null)
            setIsModalOpen(true)
          }}
          className="inline-flex items-center px-2.5 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add {viewType === 'budget' ? 'Item' : 'Expense'}
        </button>
      </div>

      {/* Excel-like Table */}
      {sortedItems.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <PieChart className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">No {viewType === 'budget' ? 'budget items' : 'expenses'} yet</p>
          <button
            onClick={() => {
              setEditingItem(null)
              setIsModalOpen(true)
            }}
            className="text-xs text-primary-600 hover:text-primary-700 mt-2"
          >
            Add {viewType === 'budget' ? 'Budget Item' : 'Expense'}
          </button>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name
                    <SortIcon column="name" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[100px]"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category
                    <SortIcon column="category" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[60px]"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Qty
                    <SortIcon column="quantity" />
                  </div>
                </th>
                <th className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 w-[50px]">
                  Unit
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[80px]"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Price
                    <SortIcon column="amount" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[90px]"
                  onClick={() => handleSort('total')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Total
                    <SortIcon column="total" />
                  </div>
                </th>
                {viewType === 'expenses' && (
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[50px]"
                    onClick={() => handleSort('isPaid')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Paid
                      <SortIcon column="isPaid" />
                    </div>
                  </th>
                )}
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-[50px]">
                  Act.
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item: BudgetItem, index: number) => {
                const total = item.amount * item.quantity
                return (
                  <tr
                    key={item.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    {/* Row Number */}
                    <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">
                      {index + 1}
                    </td>

                    {/* Name */}
                    <td className="px-2 py-1 border-r border-gray-200">
                      <div className="font-medium text-gray-900 truncate">{item.name}</div>
                      {item.description && (
                        <div className="text-[10px] text-gray-500 truncate">{item.description}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-700">
                      <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">{item.category}</span>
                    </td>

                    {/* Quantity */}
                    <td className="px-2 py-1 border-r border-gray-200 text-right text-gray-700">
                      {item.quantity}
                    </td>

                    {/* Unit */}
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-500">
                      {item.unit || '-'}
                    </td>

                    {/* Price */}
                    <td className="px-2 py-1 border-r border-gray-200 text-right text-gray-700">
                      {formatCurrency(item.amount)}
                    </td>

                    {/* Total */}
                    <td className="px-2 py-1 border-r border-gray-200 text-right font-medium text-gray-900">
                      {formatCurrency(total)}
                    </td>

                    {/* Paid Status (for expenses only) */}
                    {viewType === 'expenses' && (
                      <td className="px-2 py-1 border-r border-gray-200 text-center">
                        <button
                          onClick={() => togglePaid(item)}
                          className={`p-0.5 rounded ${item.isPaid ? 'text-green-600 bg-green-50' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="px-1 py-1 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          onClick={() => {
                            setEditingItem(item)
                            setIsModalOpen(true)
                          }}
                          className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Delete this item?')) {
                              deleteMutation.mutate(item.id)
                            }
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {/* Totals Row */}
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="px-1 py-1.5 border-r border-gray-200"></td>
                <td className="px-2 py-1.5 border-r border-gray-200 font-semibold text-gray-700" colSpan={5}>
                  Total ({sortedItems.length} items)
                </td>
                <td className="px-2 py-1.5 border-r border-gray-200 text-right font-bold text-gray-900">
                  {formatCurrency(sortedItems.reduce((sum: number, item: BudgetItem) => sum + (item.amount * item.quantity), 0))}
                </td>
                {viewType === 'expenses' && (
                  <td className="px-2 py-1.5 border-r border-gray-200 text-center">
                    <span className="text-[10px] text-gray-500">
                      {sortedItems.filter((i: BudgetItem) => i.isPaid).length}/{sortedItems.length}
                    </span>
                  </td>
                )}
                <td className="px-1 py-1.5"></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Category Breakdown (compact) */}
      {sortedItems.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700">
            By Category
          </div>
          <table className="w-full text-xs">
            <tbody>
              {(Object.entries(
                sortedItems.reduce((acc: { [key: string]: number }, item: BudgetItem) => {
                  acc[item.category] = (acc[item.category] || 0) + (item.amount * item.quantity)
                  return acc
                }, {})
              ) as [string, number][])
                .sort((a, b) => b[1] - a[1])
                .map(([category, total], idx) => {
                  const percentage = sortedItems.reduce((sum: number, item: BudgetItem) => sum + (item.amount * item.quantity), 0) > 0
                    ? ((total as number) / sortedItems.reduce((sum: number, item: BudgetItem) => sum + (item.amount * item.quantity), 0)) * 100
                    : 0
                  return (
                    <tr key={category} className={`border-b border-gray-100 last:border-0 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                      <td className="px-2 py-1.5 font-medium text-gray-700 w-[120px]">{category}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-primary-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-gray-500 w-10 text-right">{percentage.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900 w-[90px]">
                        {formatCurrency(total as number)}
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                {editingItem ? 'Edit' : 'Add'} {viewType === 'budget' ? 'Budget Item' : 'Expense'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

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
                <Form className="p-4 space-y-3">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <Field
                      id="name"
                      name="name"
                      type="text"
                      className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="e.g., Materials, Labor"
                    />
                    <ErrorMessage name="name" component="p" className="mt-0.5 text-[10px] text-red-600" />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <Field
                      as="textarea"
                      id="description"
                      name="description"
                      rows={2}
                      className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="Optional description..."
                    />
                  </div>

                  <div>
                    <label htmlFor="category" className="block text-xs font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <Field
                      id="category"
                      name="category"
                      type="text"
                      className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="e.g., Materials, Labor, Equipment"
                    />
                    <ErrorMessage name="category" component="p" className="mt-0.5 text-[10px] text-red-600" />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="quantity" className="block text-xs font-medium text-gray-700 mb-1">
                        Qty <span className="text-red-500">*</span>
                      </label>
                      <Field
                        id="quantity"
                        name="quantity"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="unit" className="block text-xs font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <Field
                        id="unit"
                        name="unit"
                        type="text"
                        className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="hrs, sqft"
                      />
                    </div>

                    <div>
                      <label htmlFor="amount" className="block text-xs font-medium text-gray-700 mb-1">
                        Price ({currencySymbol}) <span className="text-red-500">*</span>
                      </label>
                      <Field
                        id="amount"
                        name="amount"
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  <div className="p-2 bg-gray-50 rounded text-xs text-gray-600">
                    Total: <span className="font-semibold text-gray-900">
                      {formatCurrency((values.quantity || 0) * (values.amount || 0))}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center">
                      <Field
                        type="checkbox"
                        name="isExpense"
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                      />
                      <span className="ml-1.5 text-gray-700">This is an expense</span>
                    </label>

                    {values.isExpense && (
                      <label className="flex items-center">
                        <Field
                          type="checkbox"
                          name="isPaid"
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                        />
                        <span className="ml-1.5 text-gray-700">Mark as paid</span>
                      </label>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
                      className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      {isSubmitting || createMutation.isPending || updateMutation.isPending
                        ? 'Saving...'
                        : editingItem ? 'Save' : 'Add'
                      }
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
    </div>
  )
}

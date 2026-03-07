/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Download,
  Upload,
  Edit,
  Trash2,
  DollarSign,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { useCurrency } from '@/hooks/useCurrency'
import toast from 'react-hot-toast'
import { AddBOQItemModal } from './add-boq-item-modal'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ProjectBOQProps {
  projectId: string
}

type SortColumn = 'itemNumber' | 'name' | 'quantity' | 'unitRate' | 'totalCost' | 'variance' | null
type SortDirection = 'asc' | 'desc'

async function fetchBOQ(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/boq`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch BOQ')
  return response.json()
}

async function deleteBOQItem(itemId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/boq/${itemId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete BOQ item')
  return response.json()
}

export function ProjectBOQ({ projectId }: ProjectBOQProps) {
  const { user } = useAuthStore()
  const { format: formatCurrency } = useCurrency()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'ADMIN'

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const { data: boqData, isLoading } = useQuery({
    queryKey: ['boq', projectId],
    queryFn: () => fetchBOQ(projectId),
    enabled: !!projectId
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBOQItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq', projectId] })
      toast.success('BOQ item deleted')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete BOQ item')
    }
  })

  const handleDelete = (item: any) => {
    if (window.confirm(`Delete "${item.name}"?`)) {
      deleteMutation.mutate(item.id)
    }
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setShowAddModal(true)
  }

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(category)) {
        newSet.delete(category)
      } else {
        newSet.add(category)
      }
      return newSet
    })
  }

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const getVarianceColor = (variancePercent: number) => {
    if (variancePercent > 5) return 'text-green-600'
    if (variancePercent >= -5 && variancePercent <= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const handleExportPDF = () => {
    if (!boqData || !filteredData) {
      toast.error('No data to export')
      return
    }

    try {
      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let yPosition = 20

      doc.setFontSize(20)
      doc.setTextColor(79, 70, 229)
      doc.text('Bill of Quantities (BOQ)', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text('Summary', 14, yPosition)
      yPosition += 10

      const summaryData = [
        ['Total Estimated', formatCurrency(summary.totalEstimated)],
        ['Total Actual', formatCurrency(summary.totalActual)],
        ['Variance', `${summary.totalVariance < 0 ? '-' : '+'}${formatCurrency(Math.abs(summary.totalVariance))} (${summary.variancePercent.toFixed(1)}%)`],
        ['Total Items', summary.itemCount.toString()]
      ]

      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 60 },
          1: { halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      })

      yPosition = (doc as any).lastAutoTable.finalY + 15

      filteredData.groupedByCategory.forEach((categoryGroup: any) => {
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20
        }

        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.setFillColor(241, 245, 249)
        doc.rect(14, yPosition - 5, pageWidth - 28, 10, 'F')
        doc.text(`${categoryGroup.category} (${categoryGroup.items.length} items)`, 16, yPosition)
        yPosition += 10

        const tableData = categoryGroup.items.map((item: any) => [
          item.itemNumber,
          item.name + (item.isContingency ? ' [C]' : ''),
          `${item.quantity} ${item.unit}`,
          formatCurrency(item.unitRate),
          formatCurrency(item.totalCost),
          item.actualCost > 0 ? `${item.variance < 0 ? '-' : '+'}${formatCurrency(Math.abs(item.variance))}` : '-'
        ])

        autoTable(doc, {
          startY: yPosition,
          head: [['#', 'Description', 'Qty', 'Rate', 'Total', 'Var']],
          body: tableData,
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [148, 163, 184], fontSize: 8 },
          margin: { left: 14, right: 14 }
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10
      })

      doc.save(`BOQ_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('BOQ exported')
    } catch (error) {
      toast.error('Failed to export BOQ')
    }
  }

  // Filter items
  const filteredData = boqData ? {
    ...boqData,
    groupedByCategory: boqData.groupedByCategory
      .filter((cat: any) => selectedCategory === 'all' || cat.category === selectedCategory)
      .map((cat: any) => ({
        ...cat,
        items: cat.items.filter((item: any) =>
          searchTerm === '' ||
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }))
      .filter((cat: any) => cat.items.length > 0)
  } : null

  // Sort items within each category
  const sortItems = (items: any[]) => {
    if (!sortColumn) return items

    return [...items].sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1

      switch (sortColumn) {
        case 'itemNumber':
          return a.itemNumber.localeCompare(b.itemNumber) * multiplier
        case 'name':
          return a.name.localeCompare(b.name) * multiplier
        case 'quantity':
          return (a.quantity - b.quantity) * multiplier
        case 'unitRate':
          return (a.unitRate - b.unitRate) * multiplier
        case 'totalCost':
          return (a.totalCost - b.totalCost) * multiplier
        case 'variance':
          return (a.variance - b.variance) * multiplier
        default:
          return 0
      }
    })
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const summary = boqData?.summary || {
    totalEstimated: 0,
    totalActual: 0,
    totalVariance: 0,
    variancePercent: 0,
    itemCount: 0
  }

  const categories = boqData?.groupedByCategory?.map((cat: any) => cat.category) || []
  const progress = summary.totalEstimated > 0 ? ((summary.totalActual / summary.totalEstimated) * 100) : 0

  return (
    <div className="space-y-3">
      {/* Compact Header Stats Bar */}
      <div className="bg-slate-800 rounded-lg p-2.5 text-white">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-slate-100">{formatCurrency(summary.totalEstimated)}</div>
            <div className="text-[10px] text-slate-400 uppercase">Estimated</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-blue-400">{formatCurrency(summary.totalActual)}</div>
            <div className="text-[10px] text-slate-400 uppercase">Actual</div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${summary.totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summary.totalVariance < 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.totalVariance))}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Variance</div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${summary.variancePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summary.variancePercent.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Var %</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-slate-100">{summary.itemCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">Items</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-amber-400">{progress.toFixed(0)}%</div>
            <div className="text-[10px] text-slate-400 uppercase">Progress</div>
          </div>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Categories</option>
            {categories.map((cat: string) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          {isAdmin && (
            <>
              <button
                onClick={() => {
                  setEditingItem(null)
                  setShowAddModal(true)
                }}
                className="inline-flex items-center px-2.5 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </button>
              <button className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs rounded hover:bg-gray-50 transition-colors">
                <Upload className="h-3 w-3 mr-1" />
                Import
              </button>
            </>
          )}
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 text-xs rounded hover:bg-gray-50 transition-colors"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </button>
        </div>
      </div>

      {/* BOQ Table */}
      {filteredData && filteredData.groupedByCategory.length > 0 ? (
        <div className="space-y-2">
          {filteredData.groupedByCategory.map((categoryGroup: any) => {
            const isCollapsed = collapsedCategories.has(categoryGroup.category)
            const sortedItems = sortItems(categoryGroup.items)

            return (
              <div key={categoryGroup.category} className="border border-gray-300 rounded-lg overflow-hidden">
                {/* Category Header */}
                <div
                  onClick={() => toggleCategory(categoryGroup.category)}
                  className="bg-gray-100 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="text-sm font-semibold text-gray-900">{categoryGroup.category}</span>
                    <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 text-[10px] rounded">
                      {categoryGroup.items.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-gray-500">Est:</span>
                      <span className="ml-1 font-medium">{formatCurrency(categoryGroup.estimated)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Act:</span>
                      <span className="ml-1 font-medium">{formatCurrency(categoryGroup.actual)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500">Var:</span>
                      <span className={`ml-1 font-medium ${getVarianceColor(categoryGroup.variancePercent)}`}>
                        {categoryGroup.variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(categoryGroup.variance))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category Items Table */}
                {!isCollapsed && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                        <th
                          className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 w-[70px]"
                          onClick={() => handleSort('itemNumber')}
                        >
                          <div className="flex items-center gap-1">
                            Item
                            <SortIcon column="itemNumber" />
                          </div>
                        </th>
                        <th
                          className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 min-w-[150px]"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Description
                            <SortIcon column="name" />
                          </div>
                        </th>
                        <th
                          className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 w-[80px]"
                          onClick={() => handleSort('quantity')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Qty
                            <SortIcon column="quantity" />
                          </div>
                        </th>
                        <th
                          className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 w-[80px]"
                          onClick={() => handleSort('unitRate')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Rate
                            <SortIcon column="unitRate" />
                          </div>
                        </th>
                        <th
                          className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 w-[90px]"
                          onClick={() => handleSort('totalCost')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Total
                            <SortIcon column="totalCost" />
                          </div>
                        </th>
                        <th
                          className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 w-[80px]"
                          onClick={() => handleSort('variance')}
                        >
                          <div className="flex items-center justify-end gap-1">
                            Variance
                            <SortIcon column="variance" />
                          </div>
                        </th>
                        {isAdmin && (
                          <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-[50px]">
                            Act.
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedItems.map((item: any, index: number) => (
                        <tr
                          key={item.id}
                          className={`border-b border-gray-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                          {/* Row Number */}
                          <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">
                            {index + 1}
                          </td>

                          {/* Item Number */}
                          <td className="px-2 py-1 border-r border-gray-200 font-medium text-gray-900">
                            {item.itemNumber}
                          </td>

                          {/* Description */}
                          <td className="px-2 py-1 border-r border-gray-200">
                            <div className="flex items-center gap-1">
                              <span className="font-medium text-gray-900">{item.name}</span>
                              {item.isContingency && (
                                <span className="px-1 py-0.5 bg-amber-100 text-amber-700 text-[9px] rounded" title="Contingency">
                                  C
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-[10px] text-gray-500 truncate">{item.description}</div>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="px-2 py-1 border-r border-gray-200 text-right text-gray-700">
                            {item.quantity} <span className="text-gray-500">{item.unit}</span>
                          </td>

                          {/* Unit Rate */}
                          <td className="px-2 py-1 border-r border-gray-200 text-right text-gray-700">
                            {formatCurrency(item.unitRate)}
                          </td>

                          {/* Total Cost */}
                          <td className="px-2 py-1 border-r border-gray-200 text-right font-medium text-gray-900">
                            {formatCurrency(item.totalCost)}
                          </td>

                          {/* Variance */}
                          <td className="px-2 py-1 border-r border-gray-200 text-right">
                            {item.actualCost > 0 ? (
                              <div className={getVarianceColor(item.variancePercent)}>
                                <div className="font-medium">
                                  {item.variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.variance))}
                                </div>
                                <div className="text-[10px]">({item.variancePercent.toFixed(1)}%)</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          {isAdmin && (
                            <td className="px-1 py-1 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                                  title="Edit"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                      {/* Category Total Row */}
                      <tr className="bg-gray-100 border-t border-gray-300">
                        <td className="px-1 py-1.5 border-r border-gray-200"></td>
                        <td className="px-2 py-1.5 border-r border-gray-200 font-semibold text-gray-700" colSpan={4}>
                          Subtotal ({categoryGroup.items.length} items)
                        </td>
                        <td className="px-2 py-1.5 border-r border-gray-200 text-right font-bold text-gray-900">
                          {formatCurrency(categoryGroup.estimated)}
                        </td>
                        <td className={`px-2 py-1.5 border-r border-gray-200 text-right font-bold ${getVarianceColor(categoryGroup.variancePercent)}`}>
                          {categoryGroup.variance !== 0 && (
                            <>{categoryGroup.variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(categoryGroup.variance))}</>
                          )}
                        </td>
                        {isAdmin && <td className="px-1 py-1.5"></td>}
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            )
          })}

          {/* Grand Total */}
          <div className="border border-gray-300 rounded-lg overflow-hidden bg-slate-800 text-white">
            <div className="px-3 py-2 flex items-center justify-between">
              <span className="text-sm font-semibold">Grand Total</span>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-slate-400">Estimated:</span>
                  <span className="ml-2 font-bold">{formatCurrency(summary.totalEstimated)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Actual:</span>
                  <span className="ml-2 font-bold">{formatCurrency(summary.totalActual)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Variance:</span>
                  <span className={`ml-2 font-bold ${summary.totalVariance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {summary.totalVariance < 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.totalVariance))}
                    <span className="text-xs ml-1">({summary.variancePercent.toFixed(1)}%)</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <DollarSign className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            {searchTerm || selectedCategory !== 'all' ? 'No items match your search' : 'No BOQ items yet'}
          </p>
          {isAdmin && !searchTerm && selectedCategory === 'all' && (
            <button
              onClick={() => {
                setEditingItem(null)
                setShowAddModal(true)
              }}
              className="text-xs text-primary-600 hover:text-primary-700 mt-2"
            >
              Add First Item
            </button>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddBOQItemModal
          projectId={projectId}
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false)
            setEditingItem(null)
          }}
          editItem={editingItem}
        />
      )}
    </div>
  )
}

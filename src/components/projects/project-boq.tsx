/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  Package,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
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
  const [showFilters, setShowFilters] = useState(false)

  const { data: boqData, isLoading } = useQuery({
    queryKey: ['boq', projectId],
    queryFn: () => fetchBOQ(projectId),
    enabled: !!projectId
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBOQItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boq', projectId] })
      toast.success('BOQ item deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete BOQ item')
    }
  })

  const handleDelete = (item: any) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
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

  const getVarianceColor = (variancePercent: number) => {
    if (variancePercent > 5) return 'text-green-600'
    if (variancePercent >= -5 && variancePercent <= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getVarianceBgColor = (variancePercent: number) => {
    if (variancePercent > 5) return 'bg-green-50'
    if (variancePercent >= -5 && variancePercent <= 5) return 'bg-yellow-50'
    return 'bg-red-50'
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

      // Title
      doc.setFontSize(20)
      doc.setTextColor(79, 70, 229) // Purple color
      doc.text('Bill of Quantities (BOQ)', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      // Date
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      // Summary Section
      doc.setFontSize(14)
      doc.setTextColor(0, 0, 0)
      doc.text('Summary', 14, yPosition)
      yPosition += 10

      const summaryData = [
        ['Total Estimated', formatCurrency(summary.totalEstimated)],
        ['Total Actual', formatCurrency(summary.totalActual)],
        ['Variance', `${summary.totalVariance < 0 ? '-' : '+'}${formatCurrency(Math.abs(summary.totalVariance))} (${summary.variancePercent.toFixed(1)}%)`],
        ['Total Items', summary.itemCount.toString()],
        ['Progress', `${summary.totalEstimated > 0 ? ((summary.totalActual / summary.totalEstimated) * 100).toFixed(0) : 0}%`]
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

      // BOQ Items by Category
      filteredData.groupedByCategory.forEach((categoryGroup: any, index: number) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20
        }

        // Category Header
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.setFillColor(241, 245, 249) // Slate-100
        doc.rect(14, yPosition - 5, pageWidth - 28, 10, 'F')
        doc.text(`${categoryGroup.category} (${categoryGroup.items.length} items)`, 16, yPosition)
        yPosition += 2

        // Category Summary
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        const categoryText = `Est: ${formatCurrency(categoryGroup.estimated)} | Act: ${formatCurrency(categoryGroup.actual)} | Var: ${categoryGroup.variance < 0 ? '-' : '+'}${formatCurrency(Math.abs(categoryGroup.variance))}`
        doc.text(categoryText, pageWidth - 16, yPosition, { align: 'right' })
        yPosition += 10

        // Items Table
        const tableData = categoryGroup.items.map((item: any) => [
          item.itemNumber,
          item.name + (item.description ? `\n${item.description}` : '') + (item.isContingency ? '\n[Contingency]' : ''),
          `${item.quantity} ${item.unit}`,
          formatCurrency(item.unitRate),
          formatCurrency(item.totalCost),
          item.actualCost > 0 ? `${item.variance < 0 ? '-' : '+'}${formatCurrency(Math.abs(item.variance))}\n(${item.variancePercent.toFixed(1)}%)` : '-'
        ])

        autoTable(doc, {
          startY: yPosition,
          head: [['Item #', 'Description', 'Quantity', 'Unit Rate', 'Total Cost', 'Variance']],
          body: tableData,
          theme: 'striped',
          styles: {
            fontSize: 8,
            cellPadding: 3
          },
          headStyles: {
            fillColor: [148, 163, 184], // Slate-400
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 8
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 60 },
            2: { cellWidth: 25, halign: 'right' },
            3: { cellWidth: 25, halign: 'right' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 30, halign: 'right' }
          },
          margin: { left: 14, right: 14 },
          didParseCell: function(data: any) {
            // Color variance cells
            if (data.column.index === 5 && data.cell.raw !== '-') {
              const cellText = data.cell.text[0] || ''
              if (cellText.startsWith('-')) {
                data.cell.styles.textColor = [220, 38, 38] // Red
              } else if (cellText.startsWith('+')) {
                data.cell.styles.textColor = [22, 163, 74] // Green
              }
            }
          }
        })

        yPosition = (doc as any).lastAutoTable.finalY + 10
      })

      // Footer on last page
      const totalPages = (doc as any).internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        )
      }

      // Save the PDF
      doc.save(`BOQ_Export_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('BOQ exported successfully')
    } catch (error) {
      console.error('Error exporting BOQ:', error)
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-200 rounded-full animate-spin border-t-purple-600 mx-auto"></div>
          <p className="mt-4 text-slate-500">Loading BOQ...</p>
        </div>
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

  return (
    <div className="space-y-4">
      {/* Summary Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600">Total Estimated</span>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.totalEstimated)}</p>
          <p className="text-xs text-slate-500">{summary.itemCount} items</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600">Total Actual</span>
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.totalActual)}</p>
          <p className="text-xs text-slate-500">Manual entry</p>
        </div>

        <div className={`bg-white rounded-lg border border-slate-200 p-3 ${getVarianceBgColor(summary.variancePercent)}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600">Variance</span>
            {summary.totalVariance < 0 ? (
              <TrendingDown className={`h-4 w-4 ${getVarianceColor(summary.variancePercent)}`} />
            ) : (
              <TrendingUp className={`h-4 w-4 ${getVarianceColor(summary.variancePercent)}`} />
            )}
          </div>
          <p className={`text-xl font-bold ${getVarianceColor(summary.variancePercent)}`}>
            {summary.totalVariance < 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.totalVariance))}
          </p>
          <p className={`text-xs ${getVarianceColor(summary.variancePercent)}`}>
            {summary.variancePercent.toFixed(1)}% {summary.totalVariance < 0 ? 'under' : 'over'}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-600">Progress</span>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">
            {summary.totalEstimated > 0 ? ((summary.totalActual / summary.totalEstimated) * 100).toFixed(0) : 0}%
          </p>
          <div className="mt-1.5 bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all"
              style={{
                width: `${Math.min(100, summary.totalEstimated > 0 ? (summary.totalActual / summary.totalEstimated) * 100 : 0)}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search BOQ items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((cat: string) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={() => {
                    setEditingItem(null)
                    setShowAddModal(true)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="h-5 w-5" />
                  <span className="hidden sm:inline">Add Item</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
                  <Upload className="h-5 w-5" />
                  <span className="hidden sm:inline">Import</span>
                </button>
              </>
            )}
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* BOQ Table */}
      {filteredData && filteredData.groupedByCategory.length > 0 ? (
        <div className="space-y-4">
          {filteredData.groupedByCategory.map((categoryGroup: any) => (
            <div key={categoryGroup.category} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Category Header */}
              <div
                onClick={() => toggleCategory(categoryGroup.category)}
                className="bg-slate-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {collapsedCategories.has(categoryGroup.category) ? (
                    <ChevronRight className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                  <h3 className="text-lg font-semibold text-slate-900">{categoryGroup.category}</h3>
                  <span className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded-full">
                    {categoryGroup.items.length} items
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Estimated</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(categoryGroup.estimated)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Actual</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(categoryGroup.actual)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Variance</p>
                    <p className={`text-lg font-semibold ${getVarianceColor(categoryGroup.variancePercent)}`}>
                      {categoryGroup.variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(categoryGroup.variance))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Category Items */}
              {!collapsedCategories.has(categoryGroup.category) && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Item #</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Unit Rate</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Total Cost</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">Variance</th>
                        {isAdmin && (
                          <th className="px-6 py-3 text-center text-xs font-medium text-slate-700 uppercase tracking-wider">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {categoryGroup.items.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900">{item.itemNumber}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div>
                                <p className="text-sm font-medium text-slate-900">{item.name}</p>
                                {item.description && (
                                  <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                                )}
                                {item.isContingency && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded">
                                      <AlertCircle className="h-3 w-3" />
                                      Contingency
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm text-slate-900">{item.quantity} {item.unit}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm text-slate-900">{formatCurrency(item.unitRate)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <span className="text-sm font-medium text-slate-900">{formatCurrency(item.totalCost)}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {item.actualCost > 0 ? (
                              <div>
                                <span className={`text-sm font-medium ${getVarianceColor(item.variancePercent)}`}>
                                  {item.variance < 0 ? '-' : '+'}{formatCurrency(Math.abs(item.variance))}
                                </span>
                                <p className={`text-xs ${getVarianceColor(item.variancePercent)}`}>
                                  ({item.variancePercent.toFixed(1)}%)
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-slate-400">-</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                                  title="Edit"
                                >
                                  <Edit className="h-4 w-4 text-slate-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(item)}
                                  className="p-1 hover:bg-red-50 rounded transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No BOQ Items Yet</h3>
          <p className="text-slate-600 mb-6">
            {searchTerm || selectedCategory !== 'all'
              ? 'No items match your search criteria.'
              : 'Start building your Bill of Quantities by adding items.'}
          </p>
          {isAdmin && !searchTerm && selectedCategory === 'all' && (
            <button
              onClick={() => {
                setEditingItem(null)
                setShowAddModal(true)
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add First BOQ Item
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

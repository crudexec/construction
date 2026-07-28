'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wrench, X, ClipboardCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

interface MaintenanceSchedule {
  id: string
  title: string
  description: string | null
  type: 'ONE_TIME' | 'RECURRING'
  intervalDays: number | null
  nextDueDate: string
  isActive: boolean
}

interface MaintenanceRecord {
  id: string
  title: string
  description: string | null
  performedDate: string
  cost: number | null
  notes: string | null
  serviceType: string | null
  quantity: number | null
  quantityUnit: string | null
  meterReadingAtService: number | null
  performedBy: { id: string; firstName: string; lastName: string }
  schedule?: { id: string; title: string } | null
}

interface Inspection {
  id: string
  inspectionType: 'DOT' | 'OTHER'
  inspectionDate: string
  inspectorName: string | null
  certificateNumber: string | null
  passed: boolean
  expiryDate: string | null
  notes: string | null
  performedBy: { id: string; firstName: string; lastName: string }
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  OIL_CHANGE: 'Oil Change',
  FUEL: 'Fuel',
  HYDRAULIC_FLUID: 'Hydraulic Fluid',
  FILTER_OIL: 'Oil Filter',
  FILTER_FUEL: 'Fuel Filter',
  FILTER_HYDRAULIC: 'Hydraulic Filter',
  OTHER: 'Other'
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchMaintenance(assetId: string): Promise<{ schedules: MaintenanceSchedule[]; records: MaintenanceRecord[] }> {
  const response = await fetch(`/api/assets/${assetId}/maintenance`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch maintenance data')
  return response.json()
}

async function fetchInspections(assetId: string): Promise<Inspection[]> {
  const response = await fetch(`/api/assets/${assetId}/inspections`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch inspections')
  return response.json()
}

export function AssetMaintenanceTab({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [showRecordForm, setShowRecordForm] = useState(false)
  const [showInspectionForm, setShowInspectionForm] = useState(false)

  const [scheduleForm, setScheduleForm] = useState({
    title: '', description: '', type: 'ONE_TIME' as 'ONE_TIME' | 'RECURRING', intervalDays: '', nextDueDate: '', estimatedCost: ''
  })
  const [recordForm, setRecordForm] = useState({
    title: '', description: '', performedDate: new Date().toISOString().split('T')[0], cost: '', notes: '',
    serviceType: '', quantity: '', quantityUnit: '', meterReadingAtService: ''
  })
  const [inspectionForm, setInspectionForm] = useState({
    inspectionType: 'DOT' as 'DOT' | 'OTHER', inspectionDate: new Date().toISOString().split('T')[0],
    inspectorName: '', certificateNumber: '', passed: 'true', expiryDate: '', notes: ''
  })

  const { data, isLoading } = useQuery({
    queryKey: ['asset-maintenance', assetId],
    queryFn: () => fetchMaintenance(assetId)
  })

  const { data: inspections = [] } = useQuery({
    queryKey: ['asset-inspections', assetId],
    queryFn: () => fetchInspections(assetId)
  })

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['asset-maintenance', assetId] })
    queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
  }

  const createScheduleMutation = useMutation({
    mutationFn: async (data: typeof scheduleForm) => {
      const response = await fetch(`/api/assets/${assetId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          type: data.type,
          intervalDays: data.type === 'RECURRING' ? parseInt(data.intervalDays) : undefined,
          nextDueDate: data.nextDueDate,
          estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create schedule')
      return result
    },
    onSuccess: () => {
      toast.success('Maintenance schedule created')
      invalidateAll()
      setShowScheduleForm(false)
      setScheduleForm({ title: '', description: '', type: 'ONE_TIME', intervalDays: '', nextDueDate: '', estimatedCost: '' })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const createRecordMutation = useMutation({
    mutationFn: async (data: typeof recordForm) => {
      const response = await fetch(`/api/assets/${assetId}/maintenance/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          performedDate: data.performedDate,
          cost: data.cost ? parseFloat(data.cost) : undefined,
          notes: data.notes || undefined,
          serviceType: data.serviceType || undefined,
          quantity: data.quantity ? parseFloat(data.quantity) : undefined,
          quantityUnit: data.quantityUnit || undefined,
          meterReadingAtService: data.meterReadingAtService ? parseFloat(data.meterReadingAtService) : undefined
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to log record')
      return result
    },
    onSuccess: () => {
      toast.success('Service/maintenance record logged')
      invalidateAll()
      setShowRecordForm(false)
      setRecordForm({ title: '', description: '', performedDate: new Date().toISOString().split('T')[0], cost: '', notes: '', serviceType: '', quantity: '', quantityUnit: '', meterReadingAtService: '' })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const createInspectionMutation = useMutation({
    mutationFn: async (data: typeof inspectionForm) => {
      const response = await fetch(`/api/assets/${assetId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          inspectionType: data.inspectionType,
          inspectionDate: data.inspectionDate,
          inspectorName: data.inspectorName || undefined,
          certificateNumber: data.certificateNumber || undefined,
          passed: data.passed === 'true',
          expiryDate: data.expiryDate || undefined,
          notes: data.notes || undefined
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to log inspection')
      return result
    },
    onSuccess: () => {
      toast.success('Inspection logged')
      queryClient.invalidateQueries({ queryKey: ['asset-inspections', assetId] })
      setShowInspectionForm(false)
      setInspectionForm({ inspectionType: 'DOT', inspectionDate: new Date().toISOString().split('T')[0], inspectorName: '', certificateNumber: '', passed: 'true', expiryDate: '', notes: '' })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (isLoading || !data) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Schedules */}
      <div className="bg-white rounded-lg shadow border p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Maintenance Schedule</h3>
          <button onClick={() => setShowScheduleForm(true)} className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1">
            <Plus className="h-4 w-4" />
            Add Schedule
          </button>
        </div>
        {data.schedules.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No maintenance schedules set</p>
        ) : (
          <div className="space-y-3">
            {data.schedules.map((schedule) => (
              <div key={schedule.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">{schedule.title}</p>
                    {schedule.description && <p className="text-sm text-gray-500">{schedule.description}</p>}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${schedule.type === 'RECURRING' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                    {schedule.type === 'RECURRING' ? `Every ${schedule.intervalDays} days` : 'One-time'}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${new Date(schedule.nextDueDate) <= new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                  Due: {new Date(schedule.nextDueDate).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Records / Service Log */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Service & Maintenance History</h3>
          <button onClick={() => setShowRecordForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Log Record
          </button>
        </div>
        {data.records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Wrench className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p>No service or maintenance records yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs text-gray-500 uppercase">
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">Title / Type</th>
                <th className="px-6 py-2">Qty</th>
                <th className="px-6 py-2">Meter</th>
                <th className="px-6 py-2">Cost</th>
                <th className="px-6 py-2">Performed By</th>
              </tr>
            </thead>
            <tbody>
              {data.records.map((record) => (
                <tr key={record.id} className="border-b border-gray-100">
                  <td className="px-6 py-2 whitespace-nowrap">{new Date(record.performedDate).toLocaleDateString()}</td>
                  <td className="px-6 py-2">
                    <div className="text-gray-900">{record.title}</div>
                    {record.serviceType && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">{SERVICE_TYPE_LABELS[record.serviceType]}</span>
                    )}
                  </td>
                  <td className="px-6 py-2 text-gray-500">{record.quantity ? `${record.quantity} ${record.quantityUnit || ''}` : '-'}</td>
                  <td className="px-6 py-2 text-gray-500">{record.meterReadingAtService ?? '-'}</td>
                  <td className="px-6 py-2 text-gray-900">{record.cost ? formatCurrency(record.cost) : '-'}</td>
                  <td className="px-6 py-2 text-gray-500">{record.performedBy.firstName} {record.performedBy.lastName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inspections */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Inspections</h3>
          <button onClick={() => setShowInspectionForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2 text-sm">
            <Plus className="h-4 w-4" />
            Log Inspection
          </button>
        </div>
        {inspections.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ClipboardCheck className="h-10 w-10 mx-auto text-gray-300 mb-2" />
            <p>No inspections logged yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-xs text-gray-500 uppercase">
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">Type</th>
                <th className="px-6 py-2">Result</th>
                <th className="px-6 py-2">Inspector</th>
                <th className="px-6 py-2">Certificate #</th>
                <th className="px-6 py-2">Expires</th>
              </tr>
            </thead>
            <tbody>
              {inspections.map((inspection) => (
                <tr key={inspection.id} className="border-b border-gray-100">
                  <td className="px-6 py-2 whitespace-nowrap">{new Date(inspection.inspectionDate).toLocaleDateString()}</td>
                  <td className="px-6 py-2 text-gray-900">{inspection.inspectionType === 'DOT' ? 'DOT' : 'Other'}</td>
                  <td className="px-6 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${inspection.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {inspection.passed ? 'Passed' : 'Failed'}
                    </span>
                  </td>
                  <td className="px-6 py-2 text-gray-500">{inspection.inspectorName || '-'}</td>
                  <td className="px-6 py-2 text-gray-500">{inspection.certificateNumber || '-'}</td>
                  <td className="px-6 py-2 text-gray-500">{inspection.expiryDate ? new Date(inspection.expiryDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Schedule Modal */}
      {showScheduleForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add Maintenance Schedule</h3>
              <button onClick={() => setShowScheduleForm(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createScheduleMutation.mutate(scheduleForm) }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={scheduleForm.title} onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={scheduleForm.description} onChange={(e) => setScheduleForm({ ...scheduleForm, description: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={scheduleForm.type} onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as 'ONE_TIME' | 'RECURRING' })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="ONE_TIME">One-time</option>
                    <option value="RECURRING">Recurring</option>
                  </select>
                </div>
                {scheduleForm.type === 'RECURRING' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interval (days) *</label>
                    <input type="number" value={scheduleForm.intervalDays} onChange={(e) => setScheduleForm({ ...scheduleForm, intervalDays: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date *</label>
                <input type="date" value={scheduleForm.nextDueDate} onChange={(e) => setScheduleForm({ ...scheduleForm, nextDueDate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                <input type="number" step="0.01" value={scheduleForm.estimatedCost} onChange={(e) => setScheduleForm({ ...scheduleForm, estimatedCost: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowScheduleForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createScheduleMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createScheduleMutation.isPending ? 'Saving...' : 'Add Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Record Modal */}
      {showRecordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-medium text-gray-900">Log Service / Maintenance Record</h3>
              <button onClick={() => setShowRecordForm(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createRecordMutation.mutate(recordForm) }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" value={recordForm.title} onChange={(e) => setRecordForm({ ...recordForm, title: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="e.g., Oil change" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select value={recordForm.serviceType} onChange={(e) => setRecordForm({ ...recordForm, serviceType: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">None / General</option>
                  {Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" step="0.01" value={recordForm.quantity} onChange={(e) => setRecordForm({ ...recordForm, quantity: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" value={recordForm.quantityUnit} onChange={(e) => setRecordForm({ ...recordForm, quantityUnit: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="qt, gal, L" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meter Reading at Service</label>
                <input type="number" step="0.1" value={recordForm.meterReadingAtService} onChange={(e) => setRecordForm({ ...recordForm, meterReadingAtService: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Performed</label>
                <input type="date" value={recordForm.performedDate} onChange={(e) => setRecordForm({ ...recordForm, performedDate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                <input type="number" step="0.01" value={recordForm.cost} onChange={(e) => setRecordForm({ ...recordForm, cost: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={recordForm.notes} onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowRecordForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createRecordMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createRecordMutation.isPending ? 'Saving...' : 'Log Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Inspection Modal */}
      {showInspectionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-medium text-gray-900">Log Inspection</h3>
              <button onClick={() => setShowInspectionForm(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createInspectionMutation.mutate(inspectionForm) }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select value={inspectionForm.inspectionType} onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionType: e.target.value as 'DOT' | 'OTHER' })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="DOT">DOT</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Date *</label>
                <input type="date" value={inspectionForm.inspectionDate} onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Result *</label>
                <select value={inspectionForm.passed} onChange={(e) => setInspectionForm({ ...inspectionForm, passed: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="true">Passed</option>
                  <option value="false">Failed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inspector Name</label>
                <input type="text" value={inspectionForm.inspectorName} onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorName: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                <input type="text" value={inspectionForm.certificateNumber} onChange={(e) => setInspectionForm({ ...inspectionForm, certificateNumber: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input type="date" value={inspectionForm.expiryDate} onChange={(e) => setInspectionForm({ ...inspectionForm, expiryDate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={inspectionForm.notes} onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowInspectionForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createInspectionMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createInspectionMutation.isPending ? 'Saving...' : 'Log Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { X, Save, Loader2, Calendar, MapPin, DollarSign, User, Users, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { DatePicker } from '@/components/ui/date-picker'

interface ProjectEditModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  onUpdate?: (updatedProject: any) => void
}

export default function ProjectEditModal({ isOpen, onClose, projectId, onUpdate }: ProjectEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    projectAddress: '',
    projectCity: '',
    projectState: '',
    projectZipCode: '',
    projectSize: '',
    projectSizeUnit: 'sq ft',
    budget: '',
    timeline: '',
    startDate: '',
    endDate: '',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    stageId: '',
    ownerId: '',
    assignedUserIds: [] as string[]
  })
  
  const [stages, setStages] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectData()
      fetchStages()
      fetchUsers()
    }
  }, [isOpen, projectId])

  const fetchProjectData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch project')

      const data = await response.json()
      
      setFormData({
        title: data.title || '',
        description: data.description || '',
        contactName: data.contactName || '',
        contactEmail: data.contactEmail || '',
        contactPhone: data.contactPhone || '',
        projectAddress: data.projectAddress || '',
        projectCity: data.projectCity || '',
        projectState: data.projectState || '',
        projectZipCode: data.projectZipCode || '',
        projectSize: data.projectSize?.toString() || '',
        projectSizeUnit: data.projectSizeUnit || 'sq ft',
        budget: data.budget?.toString() || '',
        timeline: data.timeline || '',
        startDate: data.startDate ? format(new Date(data.startDate), 'yyyy-MM-dd') : '',
        endDate: data.endDate ? format(new Date(data.endDate), 'yyyy-MM-dd') : '',
        priority: data.priority || 'MEDIUM',
        status: data.status || 'ACTIVE',
        stageId: data.stageId || '',
        ownerId: data.ownerId || '',
        assignedUserIds: data.assignedUsers?.map((u: any) => u.id) || []
      })
    } catch (error) {
      console.error('Error fetching project:', error)
      toast.error('Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  const fetchStages = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/stages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch stages')

      const data = await response.json()
      setStages(data)
    } catch (error) {
      console.error('Error fetching stages:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch users')

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const validateForm = () => {
    const newErrors: any = {}
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }
    
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Invalid email format'
    }
    
    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.endDate = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      
      const dataToSend = {
        ...formData,
        projectSize: formData.projectSize ? parseFloat(formData.projectSize) : null,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        ownerId: formData.ownerId || null
      }

      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dataToSend)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update project')
      }

      const updatedProject = await response.json()
      
      toast.success('Project updated successfully!')
      
      if (onUpdate) {
        onUpdate(updatedProject)
      }
      
      onClose()
    } catch (error) {
      console.error('Error updating project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleUserSelection = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(userId)
        ? prev.assignedUserIds.filter(id => id !== userId)
        : [...prev.assignedUserIds, userId]
    }))
  }

  const handleDateChange = (fieldName: string, date: string) => {
    setFormData(prev => ({ ...prev, [fieldName]: date }))

    // Clear error for this field when user selects a date
    if (errors[fieldName]) {
      setErrors((prev: any) => ({ ...prev, [fieldName]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

        <div className="inline-block w-full max-w-4xl px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Edit Project Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        errors.title ? 'border-red-500' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.title && (
                      <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ARCHIVED">Archived</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pipeline Stage
                    </label>
                    <select
                      name="stageId"
                      value={formData.stageId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      {stages.map(stage => (
                        <option key={stage.id} value={stage.id}>
                          {stage.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Name
                    </label>
                    <input
                      type="text"
                      name="contactName"
                      value={formData.contactName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      name="contactEmail"
                      value={formData.contactEmail}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                        errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.contactEmail && (
                      <p className="mt-1 text-sm text-red-500">{errors.contactEmail}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      name="contactPhone"
                      value={formData.contactPhone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Project Location */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  Project Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      name="projectAddress"
                      value={formData.projectAddress}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      name="projectCity"
                      value={formData.projectCity}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      name="projectState"
                      value={formData.projectState}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      type="text"
                      name="projectZipCode"
                      value={formData.projectZipCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Project Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project Size
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        name="projectSize"
                        value={formData.projectSize}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <select
                        name="projectSizeUnit"
                        value={formData.projectSizeUnit}
                        onChange={handleInputChange}
                        className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      >
                        <option value="sq ft">sq ft</option>
                        <option value="sq m">sq m</option>
                        <option value="acres">acres</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <DollarSign className="w-4 h-4 inline mr-1" />
                      Budget
                    </label>
                    <input
                      type="number"
                      name="budget"
                      value={formData.budget}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeline
                    </label>
                    <input
                      type="text"
                      name="timeline"
                      value={formData.timeline}
                      onChange={handleInputChange}
                      placeholder="e.g., 6-8 weeks"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Start Date
                    </label>
                    <DatePicker
                      value={formData.startDate}
                      onChange={(date) => handleDateChange('startDate', date)}
                      placeholder="Select start date"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      End Date
                    </label>
                    <DatePicker
                      value={formData.endDate}
                      onChange={(date) => handleDateChange('endDate', date)}
                      placeholder="Select end date"
                    />
                    {errors.endDate && (
                      <p className="mt-1 text-sm text-red-500">{errors.endDate}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Assignment */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <Users className="w-5 h-5 inline mr-2" />
                  Team Assignment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <User className="w-4 h-4 inline mr-1" />
                      Project Owner
                    </label>
                    <select
                      name="ownerId"
                      value={formData.ownerId}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">No owner assigned</option>
                      {users.filter(u => u.role !== 'CLIENT').map(user => (
                        <option key={user.id} value={user.id}>
                          {user.firstName} {user.lastName} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Team Members
                    </label>
                    <div className="border border-gray-300 rounded-lg p-2 max-h-32 overflow-y-auto">
                      {users.filter(u => u.role !== 'CLIENT').map(user => (
                        <label key={user.id} className="flex items-center py-1 hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={formData.assignedUserIds.includes(user.id)}
                            onChange={() => handleUserSelection(user.id)}
                            className="mr-2"
                          />
                          <span className="text-sm">
                            {user.firstName} {user.lastName}
                            <span className="text-gray-500 ml-1">({user.role})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
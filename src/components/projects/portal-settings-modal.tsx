'use client'

import { useState, useEffect } from 'react'
import { X, Eye, EyeOff, Shield, Save, RotateCcw, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'

interface PortalSettings {
  // Project Overview Settings
  showProgress: boolean
  showTimeline: boolean
  showBudgetSummary: boolean
  showProjectDescription: boolean
  showTeamMembers: boolean
  
  // Tasks Settings
  showTasks: boolean
  showTaskAssignees: boolean
  showTaskDueDates: boolean
  showCompletedTasks: boolean
  hideInternalTasks: boolean
  
  // Documents & Files Settings
  showDocuments: boolean
  allowedFileTypes: string[]
  hideInternalDocuments: boolean
  
  // Estimates & Financial Settings
  showEstimates: boolean
  showEstimateDetails: boolean
  showInvoices: boolean
  showPayments: boolean
  
  // Communication Settings
  showMessages: boolean
  showActivityFeed: boolean
  hideInternalMessages: boolean
  
  // Additional Settings
  showPhotos: boolean
  showWalkarounds: boolean
  customWelcomeMessage: string
}

interface PortalSettingsModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSettingsUpdate?: () => void
}

const defaultSettings: PortalSettings = {
  showProgress: true,
  showTimeline: true,
  showBudgetSummary: false,
  showProjectDescription: true,
  showTeamMembers: true,
  showTasks: true,
  showTaskAssignees: false,
  showTaskDueDates: true,
  showCompletedTasks: true,
  hideInternalTasks: true,
  showDocuments: true,
  allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
  hideInternalDocuments: true,
  showEstimates: true,
  showEstimateDetails: false,
  showInvoices: false,
  showPayments: false,
  showMessages: true,
  showActivityFeed: true,
  hideInternalMessages: true,
  showPhotos: true,
  showWalkarounds: false,
  customWelcomeMessage: ''
}

export function PortalSettingsModal({ projectId, isOpen, onClose, onSettingsUpdate }: PortalSettingsModalProps) {
  const [settings, setSettings] = useState<PortalSettings>(defaultSettings)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const { showConfirm } = useModal()

  useEffect(() => {
    if (isOpen) {
      fetchSettings()
    }
  }, [isOpen, projectId])

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith('auth-token='))
      ?.split('=')[1]
  }

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const token = getToken()
      const response = await fetch(`/api/project/${projectId}/portal-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })

      if (response.ok) {
        const data = await response.json()
        const fetchedSettings = data.settings
        
        setSettings({
          showProgress: fetchedSettings.showProgress,
          showTimeline: fetchedSettings.showTimeline,
          showBudgetSummary: fetchedSettings.showBudgetSummary,
          showProjectDescription: fetchedSettings.showProjectDescription,
          showTeamMembers: fetchedSettings.showTeamMembers,
          showTasks: fetchedSettings.showTasks,
          showTaskAssignees: fetchedSettings.showTaskAssignees,
          showTaskDueDates: fetchedSettings.showTaskDueDates,
          showCompletedTasks: fetchedSettings.showCompletedTasks,
          hideInternalTasks: fetchedSettings.hideInternalTasks,
          showDocuments: fetchedSettings.showDocuments,
          allowedFileTypes: fetchedSettings.allowedFileTypes ? JSON.parse(fetchedSettings.allowedFileTypes) : defaultSettings.allowedFileTypes,
          hideInternalDocuments: fetchedSettings.hideInternalDocuments,
          showEstimates: fetchedSettings.showEstimates,
          showEstimateDetails: fetchedSettings.showEstimateDetails,
          showInvoices: fetchedSettings.showInvoices,
          showPayments: fetchedSettings.showPayments,
          showMessages: fetchedSettings.showMessages,
          showActivityFeed: fetchedSettings.showActivityFeed,
          hideInternalMessages: fetchedSettings.hideInternalMessages,
          showPhotos: fetchedSettings.showPhotos,
          showWalkarounds: fetchedSettings.showWalkarounds,
          customWelcomeMessage: fetchedSettings.customWelcomeMessage || ''
        })
      } else {
        toast.error('Failed to fetch portal settings')
      }
    } catch (error) {
      console.error('Error fetching portal settings:', error)
      toast.error('Failed to fetch portal settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const token = getToken()
      const response = await fetch(`/api/project/${projectId}/portal-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        toast.success('Portal settings saved successfully')
        onSettingsUpdate?.()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to reset all settings to defaults?',
      'Reset Portal Settings'
    )
    if (confirmed) {
      setSettings(defaultSettings)
    }
  }

  const updateSetting = (key: keyof PortalSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const SettingToggle = ({ 
    label, 
    description, 
    checked, 
    onChange,
    icon: Icon
  }: { 
    label: string
    description: string
    checked: boolean
    onChange: (checked: boolean) => void
    icon?: React.ComponentType<{ className?: string }>
  }) => (
    <div className="flex items-start justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className="h-4 w-4 text-gray-500 flex-shrink-0" />}
          <label className="text-sm font-medium text-gray-900 cursor-pointer">
            {label}
          </label>
        </div>
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
      </label>
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Client Portal Settings</h3>
                <p className="text-sm text-gray-500">Control what clients can see in their project portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-blue-600 hover:text-blue-700 p-2 hover:bg-blue-50 rounded-md flex items-center space-x-1"
                title="Preview client view"
              >
                {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                <span className="text-sm">Preview</span>
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Project Overview Settings */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Project Overview</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingToggle
                      label="Progress Bar"
                      description="Show project completion percentage"
                      checked={settings.showProgress}
                      onChange={(checked) => updateSetting('showProgress', checked)}
                    />
                    <SettingToggle
                      label="Timeline"
                      description="Display start and end dates"
                      checked={settings.showTimeline}
                      onChange={(checked) => updateSetting('showTimeline', checked)}
                    />
                    <SettingToggle
                      label="Budget Summary"
                      description="Show total project budget"
                      checked={settings.showBudgetSummary}
                      onChange={(checked) => updateSetting('showBudgetSummary', checked)}
                    />
                    <SettingToggle
                      label="Project Description"
                      description="Show project description and details"
                      checked={settings.showProjectDescription}
                      onChange={(checked) => updateSetting('showProjectDescription', checked)}
                    />
                    <SettingToggle
                      label="Team Members"
                      description="Display assigned team members"
                      checked={settings.showTeamMembers}
                      onChange={(checked) => updateSetting('showTeamMembers', checked)}
                    />
                  </div>
                </div>

                {/* Tasks Settings */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Tasks & Activities</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingToggle
                      label="Show Tasks"
                      description="Display project tasks and milestones"
                      checked={settings.showTasks}
                      onChange={(checked) => updateSetting('showTasks', checked)}
                    />
                    <SettingToggle
                      label="Task Assignees"
                      description="Show who is assigned to each task"
                      checked={settings.showTaskAssignees}
                      onChange={(checked) => updateSetting('showTaskAssignees', checked)}
                    />
                    <SettingToggle
                      label="Due Dates"
                      description="Display task due dates"
                      checked={settings.showTaskDueDates}
                      onChange={(checked) => updateSetting('showTaskDueDates', checked)}
                    />
                    <SettingToggle
                      label="Completed Tasks"
                      description="Show completed tasks in the list"
                      checked={settings.showCompletedTasks}
                      onChange={(checked) => updateSetting('showCompletedTasks', checked)}
                    />
                    <SettingToggle
                      label="Hide Internal Tasks"
                      description="Hide tasks marked as internal only"
                      checked={settings.hideInternalTasks}
                      onChange={(checked) => updateSetting('hideInternalTasks', checked)}
                    />
                  </div>
                </div>

                {/* Financial Settings */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Financial Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingToggle
                      label="Estimates"
                      description="Show project estimates"
                      checked={settings.showEstimates}
                      onChange={(checked) => updateSetting('showEstimates', checked)}
                    />
                    <SettingToggle
                      label="Estimate Details"
                      description="Show detailed estimate breakdown"
                      checked={settings.showEstimateDetails}
                      onChange={(checked) => updateSetting('showEstimateDetails', checked)}
                    />
                    <SettingToggle
                      label="Invoices"
                      description="Display invoices and billing"
                      checked={settings.showInvoices}
                      onChange={(checked) => updateSetting('showInvoices', checked)}
                    />
                    <SettingToggle
                      label="Payments"
                      description="Show payment history and status"
                      checked={settings.showPayments}
                      onChange={(checked) => updateSetting('showPayments', checked)}
                    />
                  </div>
                </div>

                {/* Communication Settings */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Communication</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingToggle
                      label="Messages"
                      description="Enable project messaging"
                      checked={settings.showMessages}
                      onChange={(checked) => updateSetting('showMessages', checked)}
                    />
                    <SettingToggle
                      label="Activity Feed"
                      description="Show project activity timeline"
                      checked={settings.showActivityFeed}
                      onChange={(checked) => updateSetting('showActivityFeed', checked)}
                    />
                    <SettingToggle
                      label="Hide Internal Messages"
                      description="Hide internal team communications"
                      checked={settings.hideInternalMessages}
                      onChange={(checked) => updateSetting('hideInternalMessages', checked)}
                    />
                  </div>
                </div>

                {/* Documents & Media */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Documents & Media</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingToggle
                      label="Documents"
                      description="Allow access to project documents"
                      checked={settings.showDocuments}
                      onChange={(checked) => updateSetting('showDocuments', checked)}
                    />
                    <SettingToggle
                      label="Photos"
                      description="Show project photos and images"
                      checked={settings.showPhotos}
                      onChange={(checked) => updateSetting('showPhotos', checked)}
                    />
                    <SettingToggle
                      label="Hide Internal Documents"
                      description="Hide internal documents from client"
                      checked={settings.hideInternalDocuments}
                      onChange={(checked) => updateSetting('hideInternalDocuments', checked)}
                    />
                    <SettingToggle
                      label="Walkarounds"
                      description="Show walkaround reports and videos"
                      checked={settings.showWalkarounds}
                      onChange={(checked) => updateSetting('showWalkarounds', checked)}
                    />
                  </div>
                </div>

                {/* Custom Welcome Message */}
                <div>
                  <h4 className="text-md font-semibold text-gray-900 mb-4">Custom Settings</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Custom Welcome Message
                      </label>
                      <textarea
                        value={settings.customWelcomeMessage}
                        onChange={(e) => updateSetting('customWelcomeMessage', e.target.value)}
                        placeholder="Enter a custom welcome message for your clients..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                      />
                      <p className="text-xs text-gray-500 mt-1">This message will appear at the top of the client portal</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={resetToDefaults}
              className="text-gray-600 hover:text-gray-700 px-4 py-2 rounded-md hover:bg-gray-100 flex items-center space-x-2"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset to Defaults</span>
            </button>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span>Save Settings</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
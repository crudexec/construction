'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import {
  Building,
  Users,
  Bell,
  Shield,
  CreditCard,
  Download,
  Upload,
  UserPlus,
  Edit,
  Trash2,
  Mail,
  Smartphone,
  Check,
  FileText,
  Key,
  Copy,
  Link2,
  Tag,
  Tags,
  Layers,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'
import { useAuthStore } from '@/store/auth'
import { TemplateManager } from '@/components/templates/template-manager'
import { EmailConfigForm } from '@/components/settings/email-config-form'
import { SMSConfigForm } from '@/components/settings/sms-config-form'
import { VendorCategoryManager } from '@/components/settings/vendor-category-manager'
import { VendorServiceTagManager } from '@/components/settings/vendor-service-tag-manager'
import { FileTagManager } from '@/components/settings/file-tag-manager'

interface Company {
  id: string
  name: string
  appName: string
  logo?: string
  website?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  currency: string
}

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'STAFF' | 'SUBCONTRACTOR' | 'CLIENT'
  isActive?: boolean
}

interface NotificationPreference {
  // Email preferences
  emailEnabled: boolean
  emailNewLead: boolean
  emailProjectUpdate: boolean
  emailTaskAssigned: boolean
  emailTaskCompleted: boolean
  emailTaskEscalated: boolean
  emailBidReceived: boolean
  emailBidStatusChange: boolean
  emailLowStock: boolean
  // SMS preferences
  smsEnabled: boolean
  smsPhoneNumber: string | null
  smsDueDateReminder: boolean
  smsTaskAssigned: boolean
  smsTaskEscalated: boolean
  smsTaskCompleted: boolean
  smsLowStock: boolean
  smsNewLead: boolean
  smsBidReceived: boolean
  smsBidStatusChange: boolean
  smsMention: boolean
  smsPurchaseOrder: boolean
  smsPaymentRecorded: boolean
  smsMilestoneReached: boolean
  smsContractChange: boolean
  smsDocumentShared: boolean
  // In-app/Push preferences
  pushNewLead: boolean
  pushProjectUpdate: boolean
  pushTaskAssigned: boolean
  pushTaskCompleted: boolean
  pushBidReceived: boolean
  pushBidStatusChange: boolean
}

const companySchema = Yup.object().shape({
  name: Yup.string().required('Company name is required'),
  appName: Yup.string().required('Application name is required'),
  website: Yup.string().url('Must be a valid URL'),
  phone: Yup.string(),
  email: Yup.string().email('Must be a valid email'),
  address: Yup.string(),
  city: Yup.string(),
  state: Yup.string(),
  zipCode: Yup.string(),
  country: Yup.string(),
  currency: Yup.string().required('Currency is required')
})

const inviteSchema = Yup.object().shape({
  email: Yup.string().email('Must be a valid email').required('Email is required'),
  firstName: Yup.string().required('First name is required'),
  lastName: Yup.string().required('Last name is required'),
  role: Yup.string().required('Role is required')
})

async function fetchCompanySettings() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/company/settings', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch company settings')
  return response.json()
}

async function updateCompanySettings(data: Partial<Company>) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/company/settings', {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update company settings')
  return response.json()
}

async function fetchTeamMembers() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch team members')
  const data = await response.json()
  // API returns array directly, not wrapped in { users: [] }
  return Array.isArray(data) ? data : (data.users || [])
}

async function inviteTeamMember(data: { email: string; firstName: string; lastName: string; role: string }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/team/invite', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  
  const responseData = await response.json()
  
  if (!response.ok) {
    console.error('Invite error:', responseData)
    throw new Error(responseData.error || 'Failed to invite team member')
  }
  
  return responseData
}

async function updateTeamMember(id: string, data: { role?: string; isActive?: boolean; newPassword?: string }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/team/${id}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update team member')
  return response.json()
}

async function deleteTeamMember(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/team/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete team member')
  return response.json()
}

async function fetchNotificationPreferences() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/notifications/preferences', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch notification preferences')
  return response.json()
}

async function updateNotificationPreferences(data: Partial<NotificationPreference>) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/notifications/preferences', {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update notification preferences')
  return response.json()
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') || 'company'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedMemberName, setSelectedMemberName] = useState<string>('')
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: fetchCompanySettings
  })

  const { data: teamMembers, isLoading: teamLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: fetchTeamMembers,
    enabled: activeTab === 'team'
  })

  const { data: notificationData, isLoading: notificationLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchNotificationPreferences,
    enabled: activeTab === 'notifications'
  })

  const updateMutation = useMutation({
    mutationFn: updateCompanySettings,
    onSuccess: (data) => {
      toast.success('Company settings updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
      
      // Update the user's company data in auth store
      if (user && data.company) {
        updateUser({
          company: { ...user.company, ...data.company }
        })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update settings')
    }
  })

  const inviteMutation = useMutation({
    mutationFn: inviteTeamMember,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setShowInviteModal(false)

      // Check if user was reactivated (previously removed user)
      if (data.reactivated) {
        toast.success('User has been reactivated and added back to the team!')
      } else {
        toast.success('Invitation created successfully!')
        // Show invite link in a success modal (only for new invites)
        setInviteLink(data.inviteUrl)
        setShowInviteLinkModal(true)
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to invite team member')
    }
  })

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; role?: string; isActive?: boolean; newPassword?: string }) => updateTeamMember(id, data),
    onSuccess: (_, variables) => {
      if (variables.newPassword) {
        toast.success('Password reset successfully!')
        setShowPasswordResetModal(false)
      } else {
        toast.success('Team member updated successfully!')
      }
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update team member')
    }
  })

  const deleteTeamMutation = useMutation({
    mutationFn: deleteTeamMember,
    onSuccess: () => {
      toast.success('Team member removed successfully!')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete team member')
    }
  })

  const updateNotificationMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: () => {
      toast.success('Notification preferences updated!')
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update preferences')
    }
  })

  const tabs = [
    { id: 'company', name: 'Company', icon: Building },
    { id: 'team', name: 'Team', icon: Users },
    { id: 'templates', name: 'Templates', icon: FileText },
    { id: 'vendor-categories', name: 'Vendor Categories', icon: Layers },
    { id: 'service-tags', name: 'Service Tags', icon: Tags },
    { id: 'file-tags', name: 'File Tags', icon: Tag },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'billing', name: 'Billing', icon: CreditCard },
  ]

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'NGN', label: 'NGN - Nigerian Naira' },
    { value: 'KES', label: 'KES - Kenyan Shilling' },
  ]

  const isLoading = companyLoading || (activeTab === 'team' && teamLoading) || (activeTab === 'notifications' && notificationLoading)
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const company = companyData?.company

  return (
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex items-center space-x-2 py-1">
        <Settings className="h-4 w-4 text-gray-500" />
        <h1 className="text-sm font-medium text-gray-900">Settings</h1>
      </div>

      {/* Compact Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="-mb-px flex flex-wrap">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-1.5 px-2 border-b-2 text-xs flex items-center space-x-1 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 font-medium'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded border border-gray-200 p-4">
        {activeTab === 'company' && company && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Company Information</h3>

            {/* Logo Upload Section */}
            <div className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
              <label className="block text-xs font-medium text-gray-700 mb-2">Company Logo</label>
              <div className="flex items-center gap-4">
                {company.logo ? (
                  <img
                    src={company.logo}
                    alt="Company Logo"
                    className="h-16 w-auto max-w-[200px] object-contain border border-gray-200 rounded bg-white p-1"
                  />
                ) : (
                  <div className="h-16 w-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-white">
                    <span className="text-xs text-gray-400">No logo</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <label className="cursor-pointer inline-flex items-center px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50">
                    <Upload className="h-3 w-3 mr-1" />
                    {company.logo ? 'Change Logo' : 'Upload Logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return

                        if (file.size > 2 * 1024 * 1024) {
                          toast.error('Logo must be less than 2MB')
                          return
                        }

                        const formData = new FormData()
                        formData.append('logo', file)

                        try {
                          const token = document.cookie
                            .split('; ')
                            .find(row => row.startsWith('auth-token='))
                            ?.split('=')[1]

                          const response = await fetch('/api/company/logo', {
                            method: 'POST',
                            headers: {
                              'Authorization': `Bearer ${token}`,
                            },
                            body: formData,
                          })

                          if (!response.ok) throw new Error('Failed to upload logo')

                          const data = await response.json()
                          queryClient.invalidateQueries({ queryKey: ['company-settings'] })
                          toast.success('Logo uploaded successfully!')
                        } catch (error) {
                          toast.error('Failed to upload logo')
                        }
                      }}
                    />
                  </label>
                  {company.logo && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateCompanySettings({ logo: null } as any)
                          queryClient.invalidateQueries({ queryKey: ['company-settings'] })
                          toast.success('Logo removed')
                        } catch (error) {
                          toast.error('Failed to remove logo')
                        }
                      }}
                      className="inline-flex items-center px-2 py-1 text-xs text-red-600 bg-white border border-red-200 rounded hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-gray-500 mt-2">
                Recommended: PNG or JPG, max 2MB. This logo will appear on generated documents.
              </p>
            </div>

            <Formik
              initialValues={{
                name: company.name || '',
                appName: company.appName || '',
                website: company.website || '',
                phone: company.phone || '',
                email: company.email || '',
                address: company.address || '',
                city: company.city || '',
                state: company.state || '',
                zipCode: company.zipCode || '',
                country: company.country || '',
                currency: company.currency || 'USD'
              }}
              validationSchema={companySchema}
              onSubmit={(values) => updateMutation.mutate(values)}
              enableReinitialize
            >
              {({ isSubmitting }) => (
                <Form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                        Company Name *
                      </label>
                      <Field
                        id="name"
                        name="name"
                        type="text"
                        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                        placeholder="Your Company Name"
                      />
                      <ErrorMessage name="name" component="p" className="mt-0.5 text-[10px] text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="appName" className="block text-xs font-medium text-gray-700 mb-1">
                        Application Name *
                      </label>
                      <Field
                        id="appName"
                        name="appName"
                        type="text"
                        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                        placeholder="e.g., ABC Construction CRM"
                      />
                      <ErrorMessage name="appName" component="p" className="mt-0.5 text-[10px] text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="currency" className="block text-xs font-medium text-gray-700 mb-1">
                        Currency *
                      </label>
                      <Field
                        as="select"
                        id="currency"
                        name="currency"
                        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                      >
                        {currencies.map((currency) => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="currency" component="p" className="mt-0.5 text-[10px] text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="website" className="block text-xs font-medium text-gray-700 mb-1">
                        Website
                      </label>
                      <Field
                        id="website"
                        name="website"
                        type="url"
                        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                        placeholder="https://yourcompany.com"
                      />
                      <ErrorMessage name="website" component="p" className="mt-0.5 text-[10px] text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-xs font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <Field
                        id="phone"
                        name="phone"
                        type="tel"
                        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                        placeholder="(555) 123-4567"
                      />
                      <ErrorMessage name="phone" component="p" className="mt-0.5 text-[10px] text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-xs font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <Field
                        id="email"
                        name="email"
                        type="email"
                        className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                        placeholder="contact@yourcompany.com"
                      />
                      <ErrorMessage name="email" component="p" className="mt-0.5 text-[10px] text-red-600" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-medium text-gray-900 mb-2">Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-xs font-medium text-gray-700 mb-1">
                          Street Address
                        </label>
                        <Field
                          id="address"
                          name="address"
                          type="text"
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                          placeholder="123 Main Street"
                        />
                        <ErrorMessage name="address" component="p" className="mt-0.5 text-[10px] text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="city" className="block text-xs font-medium text-gray-700 mb-1">
                          City
                        </label>
                        <Field
                          id="city"
                          name="city"
                          type="text"
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                          placeholder="City"
                        />
                        <ErrorMessage name="city" component="p" className="mt-0.5 text-[10px] text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="state" className="block text-xs font-medium text-gray-700 mb-1">
                          State
                        </label>
                        <Field
                          id="state"
                          name="state"
                          type="text"
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                          placeholder="State"
                        />
                        <ErrorMessage name="state" component="p" className="mt-0.5 text-[10px] text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="zipCode" className="block text-xs font-medium text-gray-700 mb-1">
                          ZIP
                        </label>
                        <Field
                          id="zipCode"
                          name="zipCode"
                          type="text"
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                          placeholder="12345"
                        />
                        <ErrorMessage name="zipCode" component="p" className="mt-0.5 text-[10px] text-red-600" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3">
                      <div>
                        <label htmlFor="country" className="block text-xs font-medium text-gray-700 mb-1">
                          Country
                        </label>
                        <Field
                          id="country"
                          name="country"
                          type="text"
                          className="block w-full rounded border border-gray-300 px-2 py-1.5 text-xs focus:border-primary-500 focus:outline-none"
                          placeholder="United States"
                        />
                        <ErrorMessage name="country" component="p" className="mt-0.5 text-[10px] text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || updateMutation.isPending}
                      className="inline-flex items-center px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        )}

        {activeTab === 'team' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-900">Team Management</h3>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Invite
              </button>
            </div>

            {teamMembers && teamMembers.length > 0 ? (
              <div className="border border-gray-200 rounded overflow-hidden">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member: User, index: number) => (
                      <tr key={member.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-2 py-1.5 text-xs font-medium text-gray-900">
                          {member.firstName} {member.lastName}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-gray-500">{member.email}</td>
                        <td className="px-2 py-1.5">
                          <select
                            value={member.role}
                            onChange={(e) => updateTeamMutation.mutate({ id: member.id, role: e.target.value as User['role'] })}
                            className="text-xs border-gray-200 rounded py-0.5 px-1 focus:ring-primary-500 focus:border-primary-500"
                            disabled={member.id === user?.id}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="STAFF">Staff</option>
                            <option value="SUBCONTRACTOR">Subcontractor</option>
                            <option value="CLIENT">Client</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                            member.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {member.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {member.id !== user?.id && (
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => {
                                  setSelectedMemberId(member.id)
                                  setSelectedMemberName(`${member.firstName} ${member.lastName}`)
                                  setShowPasswordResetModal(true)
                                }}
                                className="p-0.5 text-blue-600 hover:bg-blue-50 rounded"
                                title="Reset Password"
                              >
                                <Key className="h-3 w-3" />
                              </button>
                              <button
                                onClick={async () => {
                                  const confirmed = await showConfirm(
                                    'Are you sure you want to remove this team member?',
                                    'Remove Team Member'
                                  )
                                  if (confirmed) {
                                    deleteTeamMutation.mutate(member.id)
                                  }
                                }}
                                className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                                title="Remove Member"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <h4 className="text-xs font-medium text-gray-900 mb-1">No Team Members</h4>
                <p className="text-[10px] text-gray-500 mb-2">Start building your team by inviting members</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Invite First Member
                </button>
              </div>
            )}

            {/* Invite Modal */}
            {showInviteModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invite Team Member</h3>
                  <Formik
                    initialValues={{
                      email: '',
                      firstName: '',
                      lastName: '',
                      role: 'STAFF'
                    }}
                    validationSchema={inviteSchema}
                    onSubmit={(values) => inviteMutation.mutate(values)}
                  >
                    {({ isSubmitting }) => (
                      <Form className="space-y-4">
                        <div>
                          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <Field
                            id="invite-email"
                            name="email"
                            type="email"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                          <ErrorMessage name="email" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="invite-firstName" className="block text-sm font-medium text-gray-700">
                              First Name
                            </label>
                            <Field
                              id="invite-firstName"
                              name="firstName"
                              type="text"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <ErrorMessage name="firstName" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="invite-lastName" className="block text-sm font-medium text-gray-700">
                              Last Name
                            </label>
                            <Field
                              id="invite-lastName"
                              name="lastName"
                              type="text"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <ErrorMessage name="lastName" component="p" className="mt-1 text-sm text-red-600" />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <Field
                            as="select"
                            id="invite-role"
                            name="role"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="STAFF">Staff</option>
                            <option value="SUBCONTRACTOR">Subcontractor</option>
                            <option value="CLIENT">Client</option>
                          </Field>
                          <ErrorMessage name="role" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowInviteModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || inviteMutation.isPending}
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                          >
                            {inviteMutation.isPending ? 'Inviting...' : 'Send Invitation'}
                          </button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            )}

            {/* Invite Link Modal */}
            {showInviteLinkModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invitation Link Created</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Share this link with the team member to join your organization:
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Invitation Link
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700"
                      />
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(inviteLink)
                            toast.success('Link copied to clipboard!')
                          } catch (error) {
                            toast.error('Failed to copy link')
                          }
                        }}
                        className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm flex items-center"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                    <div className="flex items-start">
                      <Link2 className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                      <div className="text-sm text-blue-800">
                        <strong>Tip:</strong> You can also send this link via email or any messaging app. The recipient will be able to create their account using this link.
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <div className="text-sm text-yellow-800">
                      <strong>Note:</strong> This invitation link will expire in 7 days.
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowInviteLinkModal(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Password Reset Modal */}
            {showPasswordResetModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-md w-full p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Reset Password</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Reset password for <strong>{selectedMemberName}</strong>
                  </p>
                  <Formik
                    initialValues={{
                      newPassword: '',
                      confirmPassword: ''
                    }}
                    validationSchema={Yup.object().shape({
                      newPassword: Yup.string()
                        .min(8, 'Password must be at least 8 characters')
                        .required('Password is required'),
                      confirmPassword: Yup.string()
                        .oneOf([Yup.ref('newPassword')], 'Passwords must match')
                        .required('Please confirm the password')
                    })}
                    onSubmit={(values) => {
                      updateTeamMutation.mutate({
                        id: selectedMemberId,
                        newPassword: values.newPassword
                      })
                    }}
                  >
                    {({ isSubmitting, values }) => (
                      <Form className="space-y-4">
                        <div>
                          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                            New Password
                          </label>
                          <Field
                            id="newPassword"
                            name="newPassword"
                            type="password"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Enter new password"
                          />
                          <ErrorMessage name="newPassword" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                            Confirm Password
                          </label>
                          <Field
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Confirm new password"
                          />
                          <ErrorMessage name="confirmPassword" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        {values.newPassword && (
                          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                            <div className="flex items-start">
                              <Key className="h-4 w-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                              <div className="text-sm text-blue-800">
                                The user will be able to log in with this new password immediately.
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordResetModal(false)
                              setSelectedMemberId('')
                              setSelectedMemberName('')
                            }}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || updateTeamMutation.isPending}
                            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                          >
                            <Key className="h-4 w-4 mr-2" />
                            {updateTeamMutation.isPending ? 'Resetting...' : 'Reset Password'}
                          </button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateManager />
        )}

        {activeTab === 'vendor-categories' && (
          <VendorCategoryManager />
        )}

        {activeTab === 'service-tags' && (
          <VendorServiceTagManager />
        )}

        {activeTab === 'file-tags' && (
          <FileTagManager />
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            {/* Email Configuration Section (Admin Only) */}
            {user?.role === 'ADMIN' && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Email Service Configuration</h3>
                <p className="text-xs text-gray-500 mb-3">Configure your email provider to send notification emails.</p>
                <EmailConfigForm />
              </div>
            )}

            {/* SMS Configuration Section (Admin Only) */}
            {user?.role === 'ADMIN' && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-2">SMS Service Configuration</h3>
                <p className="text-xs text-gray-500 mb-3">Configure Africa&apos;s Talking to send SMS notifications.</p>
                <SMSConfigForm />
              </div>
            )}

            {/* Notification Preferences */}
            {notificationData?.preferences && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Notification Preferences</h3>
                <p className="text-xs text-gray-500 mb-3">Choose how you want to be notified about important events.</p>

                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div>
                    <div className="flex items-center mb-4">
                      <Mail className="h-5 w-5 text-gray-400 mr-2" />
                      <h4 className="font-medium text-gray-900">Email Notifications</h4>
                    </div>
                    <div className="space-y-3 pl-7">
                      {[
                        { key: 'emailNewLead', label: 'New Lead Assigned', description: 'Get notified when a new lead is assigned to you' },
                        { key: 'emailProjectUpdate', label: 'Project Updates', description: 'Updates on projects you\'re working on' },
                        { key: 'emailTaskAssigned', label: 'Task Assignment', description: 'When a task is assigned to you' },
                        { key: 'emailTaskCompleted', label: 'Task Completion', description: 'When a task you created is completed' },
                        { key: 'emailTaskEscalated', label: 'Task Escalation', description: 'When a task is escalated' },
                        { key: 'emailBidReceived', label: 'New Bid Received', description: 'When someone submits a bid on your request' },
                        { key: 'emailBidStatusChange', label: 'Bid Status Changes', description: 'When a bid status is updated' },
                        { key: 'emailLowStock', label: 'Low Stock Alerts', description: 'When inventory items are running low' }
                      ].map(({ key, label, description }) => (
                        <label key={key} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              checked={notificationData.preferences[key as keyof NotificationPreference] as boolean}
                              onChange={(e) => {
                                updateNotificationMutation.mutate({
                                  [key]: e.target.checked
                                })
                              }}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-700">{label}</div>
                            <div className="text-xs text-gray-500">{description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* SMS Notifications */}
                  <div>
                    <div className="flex items-center mb-4">
                      <Smartphone className="h-5 w-5 text-gray-400 mr-2" />
                      <h4 className="font-medium text-gray-900">SMS Notifications</h4>
                    </div>
                    <div className="space-y-3 pl-7">
                      {[
                        { key: 'smsTaskAssigned', label: 'Task Assignment', description: 'Receive SMS when a task is assigned to you' },
                        { key: 'smsTaskCompleted', label: 'Task Completion', description: 'SMS when a task you created is completed' },
                        { key: 'smsTaskEscalated', label: 'Task Escalation', description: 'Urgent SMS for escalated tasks' },
                        { key: 'smsDueDateReminder', label: 'Due Date Reminders', description: 'SMS reminders for upcoming due dates' },
                        { key: 'smsNewLead', label: 'New Lead Assigned', description: 'SMS when a new lead is assigned to you' },
                        { key: 'smsBidReceived', label: 'New Bid Received', description: 'SMS notification for new bids' },
                        { key: 'smsBidStatusChange', label: 'Bid Status Changes', description: 'SMS when bid status is updated' },
                        { key: 'smsMention', label: 'Mentions', description: 'SMS when someone mentions you' },
                        { key: 'smsPurchaseOrder', label: 'Purchase Orders', description: 'SMS for PO approvals and updates' },
                        { key: 'smsPaymentRecorded', label: 'Payments', description: 'SMS when payments are recorded' },
                        { key: 'smsMilestoneReached', label: 'Milestone Completed', description: 'SMS when milestones are completed' },
                        { key: 'smsContractChange', label: 'Contract Updates', description: 'SMS for contract changes' },
                        { key: 'smsDocumentShared', label: 'Document Sharing', description: 'SMS when documents are shared with you' },
                        { key: 'smsLowStock', label: 'Low Stock Alerts', description: 'SMS for inventory low stock warnings' }
                      ].map(({ key, label, description }) => (
                        <label key={key} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              checked={notificationData.preferences[key] as boolean || false}
                              onChange={(e) => {
                                updateNotificationMutation.mutate({
                                  [key]: e.target.checked
                                })
                              }}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-700">{label}</div>
                            <div className="text-xs text-gray-500">{description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Push/In-App Notifications */}
                  <div>
                    <div className="flex items-center mb-4">
                      <Bell className="h-5 w-5 text-gray-400 mr-2" />
                      <h4 className="font-medium text-gray-900">In-App Notifications</h4>
                    </div>
                    <div className="space-y-3 pl-7">
                      {[
                        { key: 'pushNewLead', label: 'New Lead Assigned', description: 'Instant notification for new leads' },
                        { key: 'pushProjectUpdate', label: 'Project Updates', description: 'Real-time project updates' },
                        { key: 'pushTaskAssigned', label: 'Task Assignment', description: 'Instant notification for task assignments' },
                        { key: 'pushTaskCompleted', label: 'Task Completion', description: 'When tasks are marked complete' },
                        { key: 'pushBidReceived', label: 'New Bid Received', description: 'Instant notification for new bids' },
                        { key: 'pushBidStatusChange', label: 'Bid Status Changes', description: 'When bid status changes' }
                      ].map(({ key, label, description }) => (
                        <label key={key} className="flex items-start">
                          <div className="flex items-center h-5">
                            <input
                              type="checkbox"
                              checked={notificationData.preferences[key as keyof NotificationPreference] as boolean}
                              onChange={(e) => {
                                updateNotificationMutation.mutate({
                                  [key]: e.target.checked
                                })
                              }}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-700">{label}</div>
                            <div className="text-xs text-gray-500">{description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {updateNotificationMutation.isSuccess && (
                    <div className="flex items-center text-green-600 text-sm">
                      <Check className="h-4 w-4 mr-2" />
                      Preferences saved automatically
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Security Settings</h3>
            <div className="text-center py-8">
              <Shield className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <h4 className="text-xs font-medium text-gray-900 mb-1">Security</h4>
              <p className="text-[10px] text-gray-500">Manage passwords, 2FA, and access controls</p>
              <p className="text-[10px] text-gray-400 mt-1">Coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Billing & Subscription</h3>
            <div className="text-center py-8">
              <CreditCard className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <h4 className="text-xs font-medium text-gray-900 mb-1">Billing</h4>
              <p className="text-[10px] text-gray-500">Manage your subscription and billing information</p>
              <p className="text-[10px] text-gray-400 mt-1">Coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
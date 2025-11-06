'use client'

import { useState, useEffect } from 'react'
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
  FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/auth'
import { TemplateManager } from '@/components/templates/template-manager'

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
  role: 'ADMIN' | 'USER' | 'MANAGER' | 'STAFF'
  isActive?: boolean
}

interface NotificationPreference {
  emailNewLead: boolean
  emailProjectUpdate: boolean
  emailTaskAssigned: boolean
  emailTaskCompleted: boolean
  emailBidReceived: boolean
  emailBidStatusChange: boolean
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
  return response.json()
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
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to invite team member')
  }
  return response.json()
}

async function updateTeamMember(id: string, data: { role?: string; isActive?: boolean }) {
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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showInviteLinkModal, setShowInviteLinkModal] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()

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
      toast.success('Invitation created successfully!')
      queryClient.invalidateQueries({ queryKey: ['team-members'] })
      setShowInviteModal(false)
      // Show invite link in a success modal
      setInviteLink(data.inviteUrl)
      setShowInviteLinkModal(true)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to invite team member')
    }
  })

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; role?: string; isActive?: boolean }) => updateTeamMember(id, data),
    onSuccess: () => {
      toast.success('Team member updated successfully!')
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
  ]

  const isLoading = companyLoading || (activeTab === 'team' && teamLoading) || (activeTab === 'notifications' && notificationLoading)
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  const company = companyData?.company

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your company settings and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'company' && company && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">Company Information</h3>
            
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
                <Form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Company Name *
                      </label>
                      <Field
                        id="name"
                        name="name"
                        type="text"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="Your Company Name"
                      />
                      <ErrorMessage name="name" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="appName" className="block text-sm font-medium text-gray-700">
                        Application Name *
                      </label>
                      <Field
                        id="appName"
                        name="appName"
                        type="text"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="e.g., ABC Construction CRM"
                      />
                      <ErrorMessage name="appName" component="p" className="mt-1 text-sm text-red-600" />
                      <p className="mt-1 text-xs text-gray-500">
                        This name will appear in the application header and branding
                      </p>
                    </div>

                    <div>
                      <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                        Website
                      </label>
                      <Field
                        id="website"
                        name="website"
                        type="url"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="https://yourcompany.com"
                      />
                      <ErrorMessage name="website" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                        Phone Number
                      </label>
                      <Field
                        id="phone"
                        name="phone"
                        type="tel"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="(555) 123-4567"
                      />
                      <ErrorMessage name="phone" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Company Email
                      </label>
                      <Field
                        id="email"
                        name="email"
                        type="email"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="contact@yourcompany.com"
                      />
                      <ErrorMessage name="email" component="p" className="mt-1 text-sm text-red-600" />
                    </div>

                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                        Currency *
                      </label>
                      <Field
                        as="select"
                        id="currency"
                        name="currency"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        {currencies.map((currency) => (
                          <option key={currency.value} value={currency.value}>
                            {currency.label}
                          </option>
                        ))}
                      </Field>
                      <ErrorMessage name="currency" component="p" className="mt-1 text-sm text-red-600" />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4">Address</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                          Street Address
                        </label>
                        <Field
                          id="address"
                          name="address"
                          type="text"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="123 Main Street"
                        />
                        <ErrorMessage name="address" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                          City
                        </label>
                        <Field
                          id="city"
                          name="city"
                          type="text"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="City"
                        />
                        <ErrorMessage name="city" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                          State/Province
                        </label>
                        <Field
                          id="state"
                          name="state"
                          type="text"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="State"
                        />
                        <ErrorMessage name="state" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
                          ZIP/Postal Code
                        </label>
                        <Field
                          id="zipCode"
                          name="zipCode"
                          type="text"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="12345"
                        />
                        <ErrorMessage name="zipCode" component="p" className="mt-1 text-sm text-red-600" />
                      </div>

                      <div>
                        <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                          Country
                        </label>
                        <Field
                          id="country"
                          name="country"
                          type="text"
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          placeholder="United States"
                        />
                        <ErrorMessage name="country" component="p" className="mt-1 text-sm text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting || updateMutation.isPending}
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
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
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">Team Management</h3>
              <button
                onClick={() => setShowInviteModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </button>
            </div>

            {teamMembers && teamMembers.length > 0 ? (
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {teamMembers.map((member: User) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {member.firstName} {member.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={member.role}
                            onChange={(e) => updateTeamMutation.mutate({ id: member.id, role: e.target.value as User['role'] })}
                            className="text-sm border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                            disabled={member.id === user?.id}
                          >
                            <option value="ADMIN">Admin</option>
                            <option value="MANAGER">Manager</option>
                            <option value="STAFF">Staff</option>
                            <option value="USER">User</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            member.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {member.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {member.id !== user?.id && (
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to remove this team member?')) {
                                  deleteTeamMutation.mutate(member.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Team Members</h4>
                <p className="text-gray-600 mb-4">Start building your team by inviting members</p>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
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
                            <option value="MANAGER">Manager</option>
                            <option value="STAFF">Staff</option>
                            <option value="USER">User</option>
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
                        className="px-3 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm"
                      >
                        Copy
                      </button>
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
          </div>
        )}

        {activeTab === 'templates' && (
          <TemplateManager />
        )}

        {activeTab === 'notifications' && notificationData?.preferences && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h3>
            <p className="text-gray-600 mb-6">Choose how you want to be notified about important events and updates.</p>

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
                    { key: 'emailBidReceived', label: 'New Bid Received', description: 'When someone submits a bid on your request' },
                    { key: 'emailBidStatusChange', label: 'Bid Status Changes', description: 'When a bid status is updated' }
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

              {/* Push Notifications */}
              <div>
                <div className="flex items-center mb-4">
                  <Smartphone className="h-5 w-5 text-gray-400 mr-2" />
                  <h4 className="font-medium text-gray-900">Push Notifications</h4>
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

        {activeTab === 'security' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">Security Settings</h3>
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Security</h4>
              <p className="text-gray-600 mb-4">Manage passwords, 2FA, and access controls</p>
              <p className="text-sm text-gray-500">Coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-6">Billing & Subscription</h3>
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Billing</h4>
              <p className="text-gray-600 mb-4">Manage your subscription and billing information</p>
              <p className="text-sm text-gray-500">Coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
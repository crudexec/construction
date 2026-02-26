'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { DatePicker } from '@/components/ui/date-picker'
import { VendorTagSelector } from '@/components/vendors/vendor-tag-selector'

interface VendorCategory {
  id: string
  name: string
  color: string
  csiDivision?: string
  vendorCount: number
}

interface VendorContact {
  firstName: string
  lastName: string
  email: string
  phone: string
  position: string
  isPrimary: boolean
  isBilling: boolean
}

interface VendorFormData {
  name: string
  companyName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  website: string
  licenseNumber: string
  insuranceInfo: string
  type: 'SUPPLY_AND_INSTALLATION' | 'SUPPLY' | 'INSTALLATION'
  categoryId: string
  tagIds: string[]
  scopeOfWork: string
  paymentTerms: string
  contractStartDate: string
  contractEndDate: string
  notes: string
  contacts: VendorContact[]
}

async function fetchCategories(): Promise<VendorCategory[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

async function createVendor(data: VendorFormData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    throw new Error('Failed to create vendor')
  }

  return response.json()
}

const emptyContact: VendorContact = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  position: '',
  isPrimary: false,
  isBilling: false
}

export default function NewVendorPage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState<VendorFormData>({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    licenseNumber: '',
    insuranceInfo: '',
    type: 'SUPPLY_AND_INSTALLATION',
    categoryId: '',
    tagIds: [],
    scopeOfWork: '',
    paymentTerms: '',
    contractStartDate: '',
    contractEndDate: '',
    notes: '',
    contacts: [{ ...emptyContact, isPrimary: true }]
  })

  // Fetch available categories
  const { data: categories = [] } = useQuery<VendorCategory[]>({
    queryKey: ['vendor-categories'],
    queryFn: fetchCategories
  })

  const createVendorMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      router.push('/dashboard/vendors')
    },
    onError: (error) => {
      console.error('Error creating vendor:', error)
    }
  })

  const handleInputChange = (field: keyof VendorFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleContactChange = (index: number, field: keyof VendorContact, value: any) => {
    const updatedContacts = [...formData.contacts]
    updatedContacts[index] = {
      ...updatedContacts[index],
      [field]: value
    }
    
    // Ensure only one primary contact
    if (field === 'isPrimary' && value) {
      updatedContacts.forEach((contact, i) => {
        if (i !== index) {
          contact.isPrimary = false
        }
      })
    }
    
    setFormData(prev => ({
      ...prev,
      contacts: updatedContacts
    }))
  }

  const addContact = () => {
    setFormData(prev => ({
      ...prev,
      contacts: [...prev.contacts, { ...emptyContact }]
    }))
  }

  const removeContact = (index: number) => {
    if (formData.contacts.length > 1) {
      const updatedContacts = formData.contacts.filter((_, i) => i !== index)
      // If we removed the primary contact, make the first one primary
      if (formData.contacts[index].isPrimary && updatedContacts.length > 0) {
        updatedContacts[0].isPrimary = true
      }
      setFormData(prev => ({
        ...prev,
        contacts: updatedContacts
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Filter out empty contacts
    const validContacts = formData.contacts.filter(contact => 
      contact.firstName.trim() || contact.lastName.trim() || contact.email.trim()
    )
    
    createVendorMutation.mutate({
      ...formData,
      contacts: validContacts
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/vendors"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Vendor</h1>
          <p className="text-gray-600">Create a new vendor profile</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Primary contact name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Company or business name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="contact@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a category...</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {cat.csiDivision ? `(CSI ${cat.csiDivision})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Trade or business classification</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Tags
              </label>
              <VendorTagSelector
                selectedTagIds={formData.tagIds}
                onChange={(tagIds) => handleInputChange('tagIds', tagIds)}
              />
              <p className="mt-1 text-xs text-gray-500">Select tags to classify vendor capabilities (e.g., &quot;New Construction&quot;, &quot;Residential&quot;)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as any)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="SUPPLY_AND_INSTALLATION">Supply & Installation</option>
                <option value="SUPPLY">Supply Only</option>
                <option value="INSTALLATION">Installation Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://www.company.com"
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Address Information</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Code
                </label>
                <input
                  type="text"
                  value={formData.zipCode}
                  onChange={(e) => handleInputChange('zipCode', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="12345"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Professional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                License Number
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="License number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <input
                type="text"
                value={formData.paymentTerms}
                onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., Net 30, COD, 50% upfront"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract Start Date
              </label>
              <DatePicker
                value={formData.contractStartDate}
                onChange={(date) => handleInputChange('contractStartDate', date)}
                placeholder="Select date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contract End Date
              </label>
              <DatePicker
                value={formData.contractEndDate}
                onChange={(date) => handleInputChange('contractEndDate', date)}
                placeholder="Select date"
              />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scope of Work
              </label>
              <textarea
                rows={3}
                value={formData.scopeOfWork}
                onChange={(e) => handleInputChange('scopeOfWork', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Describe the vendor's scope of work..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Information
              </label>
              <textarea
                rows={3}
                value={formData.insuranceInfo}
                onChange={(e) => handleInputChange('insuranceInfo', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Insurance carrier, policy numbers, coverage amounts, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Additional notes about this vendor..."
              />
            </div>
          </div>
        </div>

        {/* Additional Contacts */}
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
            <button
              type="button"
              onClick={addContact}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Contact</span>
            </button>
          </div>
          
          <div className="space-y-6">
            {formData.contacts.map((contact, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium text-gray-900">
                    Contact {index + 1}
                    {contact.isPrimary && (
                      <span className="ml-2 px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Primary
                      </span>
                    )}
                  </h4>
                  {formData.contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={contact.firstName}
                      onChange={(e) => handleContactChange(index, 'firstName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={contact.lastName}
                      onChange={(e) => handleContactChange(index, 'lastName', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={contact.email}
                      onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={contact.phone}
                      onChange={(e) => handleContactChange(index, 'phone', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Position
                    </label>
                    <input
                      type="text"
                      value={contact.position}
                      onChange={(e) => handleContactChange(index, 'position', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex items-center space-x-6 pt-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={contact.isPrimary}
                        onChange={(e) => handleContactChange(index, 'isPrimary', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Primary Contact</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={contact.isBilling}
                        onChange={(e) => handleContactChange(index, 'isBilling', e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Billing Contact</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/dashboard/vendors"
            className="bg-white text-gray-700 px-6 py-2 rounded-md border hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createVendorMutation.isPending}
            className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createVendorMutation.isPending ? 'Creating...' : 'Create Vendor'}
          </button>
        </div>
      </form>
    </div>
  )
}
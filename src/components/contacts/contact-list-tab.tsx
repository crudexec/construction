'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Contact as ContactIcon, ChevronUp, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
  companyName?: string
  vendor?: {
    id: string
    companyName: string
  } | null
  createdAt: string
}

async function fetchContacts() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/contacts', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch contacts')
  return response.json()
}

function getCompanyLabel(contact: Contact) {
  return contact.vendor?.companyName || contact.companyName || null
}

export function ContactListTab() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<string>('firstName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: fetchContacts
  })

  const filteredContacts = contacts.filter((contact) => {
    const term = searchTerm.toLowerCase()
    const fullName = `${contact.firstName} ${contact.lastName}`.toLowerCase()
    const company = getCompanyLabel(contact)?.toLowerCase() || ''
    return (
      fullName.includes(term) ||
      company.includes(term) ||
      (contact.email?.toLowerCase().includes(term)) ||
      (contact.phone?.includes(searchTerm))
    )
  })

  const sortedContacts = [...filteredContacts].sort((a, b) => {
    let aVal: any, bVal: any

    switch (sortField) {
      case 'company':
        aVal = getCompanyLabel(a)?.toLowerCase() || 'zzz'
        bVal = getCompanyLabel(b)?.toLowerCase() || 'zzz'
        break
      case 'email':
        aVal = (a.email || 'zzz').toLowerCase()
        bVal = (b.email || 'zzz').toLowerCase()
        break
      case 'phone':
        aVal = a.phone || 'zzz'
        bVal = b.phone || 'zzz'
        break
      case 'position':
        aVal = (a.position || 'zzz').toLowerCase()
        bVal = (b.position || 'zzz').toLowerCase()
        break
      case 'firstName':
      default:
        aVal = `${a.firstName} ${a.lastName}`.toLowerCase()
        bVal = `${b.firstName} ${b.lastName}`.toLowerCase()
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-7 pr-2 py-1 w-56 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <span className="text-xs text-gray-500">{sortedContacts.length} contacts</span>
      </div>

      {/* Table */}
      <div className="border border-gray-300 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[160px]"
                  onClick={() => handleSort('firstName')}
                >
                  <div className="flex items-center gap-1">Name <SortIcon field="firstName" /></div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[160px]"
                  onClick={() => handleSort('company')}
                >
                  <div className="flex items-center gap-1">Company <SortIcon field="company" /></div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[160px]"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">Email <SortIcon field="email" /></div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[100px]"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-1">Phone <SortIcon field="phone" /></div>
                </th>
                <th
                  className="px-2 py-1.5 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                  onClick={() => handleSort('position')}
                >
                  <div className="flex items-center gap-1">Position <SortIcon field="position" /></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    <ContactIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium">No contacts found</p>
                    <p className="text-[10px]">{searchTerm ? 'Try a different search' : 'Add your first contact'}</p>
                  </td>
                </tr>
              ) : (
                sortedContacts.map((contact, index) => (
                  <tr
                    key={contact.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                    onClick={() => router.push(`/dashboard/contacts/${contact.id}`)}
                  >
                    <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">{index + 1}</td>
                    <td className="px-2 py-1 border-r border-gray-200 font-medium text-gray-900 truncate">
                      {contact.firstName} {contact.lastName}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-700 truncate">
                      {getCompanyLabel(contact) || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-600 truncate">
                      {contact.email || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-600">
                      {contact.phone || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-2 py-1 text-gray-600 truncate">
                      {contact.position || <span className="text-gray-400">-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1 text-[10px] text-gray-500">
        <span>Showing {sortedContacts.length} of {contacts.length} contacts</span>
        <span>Click row to view details | Sort by clicking column headers</span>
      </div>
    </div>
  )
}

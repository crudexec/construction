'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, Plus, Eye, Edit, Trash2, Phone, Mail, DollarSign, Calendar } from 'lucide-react'
import { AddCardModal } from '@/components/kanban/add-card-modal'

interface Lead {
  id: string
  title: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  budget?: number
  priority: string
  timeline?: string
  stage: {
    id: string
    name: string
    color: string
  }
  createdAt: string
}

async function fetchLeads() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/card/all', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch leads')
  return response.json()
}

export default function LeadsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStage, setSelectedStage] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { data: leads = [], isLoading, refetch } = useQuery({
    queryKey: ['leads'],
    queryFn: fetchLeads,
  })

  // Get unique stages for filter
  const stagesMap = new Map()
  leads.forEach((lead: Lead) => {
    if (lead.stage && !stagesMap.has(lead.stage.id)) {
      stagesMap.set(lead.stage.id, lead.stage)
    }
  })
  const stages = Array.from(stagesMap.values())
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  // Filter leads
  const filteredLeads = leads.filter((lead: Lead) => {
    const matchesSearch = lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStage = selectedStage === 'all' || lead.stage.id === selectedStage
    const matchesPriority = selectedPriority === 'all' || lead.priority === selectedPriority
    
    return matchesSearch && matchesStage && matchesPriority
  })

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
            <p className="text-sm text-gray-500">
              {filteredLeads.length} of {leads.length} leads
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700 flex items-center space-x-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Add Lead</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-full rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {/* Stage Filter */}
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">All Stages</option>
              {stages.map((stage: any) => (
                <option key={stage.id} value={stage.id}>
                  {stage.name}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="rounded-md border border-gray-300 py-2 px-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="all">All Priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>

            {/* Results Count */}
            <div className="flex items-center text-sm text-gray-500">
              Showing {filteredLeads.length} of {leads.length} leads
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead: Lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{lead.title}</div>
                        {lead.timeline && (
                          <div className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {lead.timeline}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div>
                        {lead.contactName && (
                          <div className="text-sm font-medium text-gray-900">{lead.contactName}</div>
                        )}
                        {(lead.contactEmail || lead.contactPhone) && (
                          <div className="text-xs text-gray-500 flex items-center">
                            {lead.contactEmail ? (
                              <>
                                <Mail className="h-3 w-3 mr-1" />
                                {lead.contactEmail}
                              </>
                            ) : (
                              <>
                                <Phone className="h-3 w-3 mr-1" />
                                {lead.contactPhone}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full mr-2"
                          style={{ backgroundColor: lead.stage.color }}
                        />
                        <span className="text-sm text-gray-900">{lead.stage.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          priorityColors[lead.priority as keyof typeof priorityColors]
                        }`}
                      >
                        {lead.priority}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {lead.budget ? (
                        <div className="flex items-center">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {lead.budget.toLocaleString()}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button className="text-primary-600 hover:text-primary-900">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLeads.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-500 text-sm">
                {searchTerm || selectedStage !== 'all' || selectedPriority !== 'all'
                  ? 'No leads match your filters'
                  : 'No leads found'}
              </div>
              {(!searchTerm && selectedStage === 'all' && selectedPriority === 'all') && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
                >
                  Add your first lead
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <AddCardModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        stageId="" // We'll need to modify the modal to handle this
      />
    </>
  )
}
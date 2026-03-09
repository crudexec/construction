'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Plus, Eye, Edit, Trash2, Phone, Mail, DollarSign, Calendar, Users } from 'lucide-react'
import { AddCardModal } from '@/components/kanban/add-card-modal'
import Link from 'next/link'

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
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {/* Compact Header */}
        <div className="flex justify-between items-center py-1">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-gray-500" />
            <h1 className="text-sm font-medium text-gray-900">Leads</h1>
            <span className="text-xs text-gray-500">
              ({filteredLeads.length}/{leads.length})
            </span>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-600 text-white px-2 py-1 rounded text-xs hover:bg-primary-700 flex items-center space-x-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        </div>

        {/* Compact Filters */}
        <div className="bg-white border border-gray-200 rounded">
          <div className="flex items-center gap-2 p-1.5">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-6 pr-2 py-1 w-full text-xs border border-gray-200 rounded focus:border-primary-500 focus:outline-none"
              />
            </div>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All Stages</option>
              {stages.map((stage: any) => (
                <option key={stage.id} value={stage.id}>{stage.name}</option>
              ))}
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              {priorities.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Compact Table */}
        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Project</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Stage</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Priority</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Budget</th>
                <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Created</th>
                <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead: Lead, index: number) => (
                <tr
                  key={lead.id}
                  className={`border-b border-gray-100 hover:bg-blue-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-2 py-1.5">
                    <Link href={`/dashboard/projects/${lead.id}`} className="block">
                      <div className="text-xs font-medium text-gray-900 truncate max-w-[180px]">{lead.title}</div>
                      {lead.timeline && (
                        <div className="text-[10px] text-gray-500 flex items-center">
                          <Calendar className="h-2.5 w-2.5 mr-0.5" />
                          {lead.timeline}
                        </div>
                      )}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">
                    {lead.contactName && (
                      <div className="text-xs text-gray-900">{lead.contactName}</div>
                    )}
                    {(lead.contactEmail || lead.contactPhone) && (
                      <div className="text-[10px] text-gray-500 flex items-center">
                        {lead.contactEmail ? (
                          <>
                            <Mail className="h-2.5 w-2.5 mr-0.5" />
                            <span className="truncate max-w-[120px]">{lead.contactEmail}</span>
                          </>
                        ) : (
                          <>
                            <Phone className="h-2.5 w-2.5 mr-0.5" />
                            {lead.contactPhone}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center">
                      <div
                        className="w-1.5 h-1.5 rounded-full mr-1.5"
                        style={{ backgroundColor: lead.stage.color }}
                      />
                      <span className="text-xs text-gray-700">{lead.stage.name}</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <span
                      className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        priorityColors[lead.priority as keyof typeof priorityColors]
                      }`}
                    >
                      {lead.priority}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {lead.budget ? (
                      <span className="text-xs text-gray-900">
                        ${lead.budget.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex justify-end space-x-1">
                      <Link href={`/dashboard/projects/${lead.id}`} className="p-0.5 text-primary-600 hover:text-primary-800">
                        <Eye className="h-3 w-3" />
                      </Link>
                      <button className="p-0.5 text-gray-500 hover:text-gray-700">
                        <Edit className="h-3 w-3" />
                      </button>
                      <button className="p-0.5 text-red-500 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredLeads.length === 0 && (
            <div className="text-center py-6">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <div className="text-xs text-gray-500">
                {searchTerm || selectedStage !== 'all' || selectedPriority !== 'all'
                  ? 'No leads match your filters'
                  : 'No leads found'}
              </div>
              {(!searchTerm && selectedStage === 'all' && selectedPriority === 'all') && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-1 text-primary-600 hover:text-primary-700 font-medium text-xs"
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
        stageId=""
      />
    </>
  )
}
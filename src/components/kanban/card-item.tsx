'use client'

import { useState, useRef, useEffect } from 'react'
import { Phone, Mail, DollarSign, Calendar, MoreVertical, Edit2, Trash2, Eye } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useRouter } from 'next/navigation'
import ProjectEditModal from '@/components/projects/ProjectEditModal'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

interface CardProps {
  card: {
    id: string
    title: string
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    budget?: number
    priority: string
    timeline?: string
  }
  onUpdate?: () => void
}

export function CardItem({ card, onUpdate }: CardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { format: formatCurrency } = useCurrency()
  
  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleView = () => {
    router.push(`/dashboard/projects/${card.id}`)
    setShowMenu(false)
  }

  const handleEdit = () => {
    setShowEditModal(true)
    setShowMenu(false)
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/projects/${card.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete project')
      }

      toast.success('Project deleted successfully')
      if (onUpdate) {
        onUpdate()
      }
    } catch (error) {
      console.error('Error deleting project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete project')
    }
    setShowMenu(false)
  }

  const handleProjectUpdate = () => {
    if (onUpdate) {
      onUpdate()
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-semibold text-gray-900 line-clamp-2">{card.title}</h4>
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                <button
                  onClick={handleView}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
                <button
                  onClick={handleEdit}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit Project
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Project
                </button>
              </div>
            )}
          </div>
        </div>

      {card.contactName && (
        <p className="text-sm text-gray-600 mb-2">{card.contactName}</p>
      )}

      <div className="space-y-1 mb-3">
        {card.contactEmail && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Mail className="h-3 w-3" />
            <span className="truncate">{card.contactEmail}</span>
          </div>
        )}
        {card.contactPhone && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Phone className="h-3 w-3" />
            <span>{card.contactPhone}</span>
          </div>
        )}
        {card.budget && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <DollarSign className="h-3 w-3" />
            <span>{formatCurrency(card.budget)}</span>
          </div>
        )}
        {card.timeline && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{card.timeline}</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "px-2 py-1 text-xs font-medium rounded-full",
            priorityColors[card.priority as keyof typeof priorityColors] || priorityColors.MEDIUM
          )}
        >
          {card.priority}
        </span>
      </div>
    </div>
    
    {showEditModal && (
      <ProjectEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        projectId={card.id}
        onUpdate={handleProjectUpdate}
      />
    )}
    </>
  )
}
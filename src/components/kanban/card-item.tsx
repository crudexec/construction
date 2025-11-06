'use client'

import { Phone, Mail, DollarSign, Calendar, MoreVertical } from 'lucide-react'
import { cn } from '@/utils/cn'

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
}

export function CardItem({ card }: CardProps) {
  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-semibold text-gray-900 line-clamp-2">{card.title}</h4>
        <button className="text-gray-400 hover:text-gray-600">
          <MoreVertical className="h-4 w-4" />
        </button>
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
            <span>${card.budget.toLocaleString()}</span>
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
  )
}
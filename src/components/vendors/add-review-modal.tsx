'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface Project {
  id: string
  title: string
}

interface AddReviewModalProps {
  vendorId: string
  vendorName?: string
  isOpen: boolean
  onClose: () => void
}

const RATING_DIMENSIONS = [
  { key: 'qualityRating', label: 'Quality of Work', description: 'Craftsmanship and attention to detail' },
  { key: 'timelinessRating', label: 'Timeliness', description: 'Meeting deadlines and schedules' },
  { key: 'communicationRating', label: 'Communication', description: 'Responsiveness and clarity' },
  { key: 'professionalismRating', label: 'Professionalism', description: 'Conduct and appearance' },
  { key: 'pricingAccuracyRating', label: 'Pricing Accuracy', description: 'Accuracy of estimates and billing' },
  { key: 'safetyComplianceRating', label: 'Safety Compliance', description: 'Following safety protocols' },
  { key: 'problemResolutionRating', label: 'Problem Resolution', description: 'Handling issues effectively' },
  { key: 'documentationRating', label: 'Documentation', description: 'Quality of paperwork and records' },
]

async function fetchProjects(): Promise<Project[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/projects', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) return []
  const data = await response.json()
  return data.projects || data || []
}

async function createReview(vendorId: string, data: Record<string, unknown>) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create review')
  }
  return response.json()
}

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange: (val: number) => void; size?: 'sm' | 'md' }) {
  const [hoverValue, setHoverValue] = useState(0)
  const iconSize = size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'

  return (
    <div className="flex space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHoverValue(star)}
          onMouseLeave={() => setHoverValue(0)}
          className="p-0.5 cursor-pointer"
        >
          <Star
            className={`${iconSize} transition-colors ${
              (hoverValue || value) >= star ? 'fill-amber-400 text-amber-400' : 'fill-none text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

export function AddReviewModal({ vendorId, vendorName, isOpen, onClose }: AddReviewModalProps) {
  const queryClient = useQueryClient()
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [projectId, setProjectId] = useState('')
  const [comments, setComments] = useState('')

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: fetchProjects,
    enabled: isOpen
  })

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => createReview(vendorId, data),
    onSuccess: () => {
      toast.success('Review added successfully!')
      queryClient.invalidateQueries({ queryKey: ['vendor-reviews', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendor-score', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      handleClose()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add review')
    }
  })

  const handleClose = () => {
    setRatings({})
    setProjectId('')
    setComments('')
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const hasRating = Object.values(ratings).some(r => r > 0)
    if (!hasRating) {
      toast.error('Please provide at least one rating')
      return
    }
    createMutation.mutate({ ...ratings, projectId: projectId || null, comments: comments || null })
  }

  const updateRating = (key: string, value: number) => {
    setRatings(prev => ({ ...prev, [key]: value }))
  }

  const ratingValues = Object.values(ratings).filter(r => r > 0)
  const averageRating = ratingValues.length > 0 ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length) * 10) / 10 : 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Add Review</h2>
              {vendorName && <p className="text-sm text-gray-500 mt-0.5">{vendorName}</p>}
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project (Optional)</label>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                <option value="">General review (no specific project)</option>
                {projects.map((project) => (<option key={project.id} value={project.id}>{project.title}</option>))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Associate this review with a specific project for context</p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">Ratings</h3>
                {averageRating > 0 && (
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-gray-500">Average:</span>
                    <span className="font-semibold text-amber-600">{averageRating}</span>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  </div>
                )}
              </div>
              <div className="grid gap-4">
                {RATING_DIMENSIONS.map(({ key, label, description }) => (
                  <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{description}</p>
                    </div>
                    <StarRating value={ratings[key] || 0} onChange={(val) => updateRating(key, val)} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments (Optional)</label>
              <textarea value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Add any additional notes about your experience with this vendor..." className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" rows={4} />
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={handleClose} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" disabled={createMutation.isPending || ratingValues.length === 0} className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{createMutation.isPending ? 'Submitting...' : 'Submit Review'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddReviewModal

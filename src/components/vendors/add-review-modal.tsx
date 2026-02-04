'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Star } from 'lucide-react'

interface AddReviewModalProps {
  vendorId: string
  isOpen: boolean
  onClose: () => void
}

interface Project {
  id: string
  name: string
}

interface ReviewData {
  overallRating: number
  qualityRating: number
  timelinessRating: number
  communicationRating: number
  professionalismRating: number
  comments: string
  projectId?: string
}

async function fetchProjects(): Promise<Project[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/projects', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch projects')
  return response.json()
}

async function createReview(vendorId: string, data: ReviewData) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) throw new Error('Failed to create review')
  return response.json()
}

const StarRating = ({ 
  rating, 
  onRatingChange, 
  label 
}: { 
  rating: number
  onRatingChange: (rating: number) => void
  label: string
}) => {
  const [hoverRating, setHoverRating] = useState(0)

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="focus:outline-none"
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              } transition-colors`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating > 0 ? `${rating}/5` : 'Not rated'}
        </span>
      </div>
    </div>
  )
}

export default function AddReviewModal({ vendorId, isOpen, onClose }: AddReviewModalProps) {
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState<ReviewData>({
    overallRating: 0,
    qualityRating: 0,
    timelinessRating: 0,
    communicationRating: 0,
    professionalismRating: 0,
    comments: '',
    projectId: ''
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: isOpen
  })

  const createReviewMutation = useMutation({
    mutationFn: (data: ReviewData) => createReview(vendorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      onClose()
      setFormData({
        overallRating: 0,
        qualityRating: 0,
        timelinessRating: 0,
        communicationRating: 0,
        professionalismRating: 0,
        comments: '',
        projectId: ''
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.overallRating === 0) {
      alert('Please provide an overall rating')
      return
    }

    const submitData = {
      ...formData,
      projectId: formData.projectId || undefined
    }

    createReviewMutation.mutate(submitData)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Add Performance Review</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Project (Optional)
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData(prev => ({ ...prev, projectId: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Overall Rating */}
            <StarRating
              rating={formData.overallRating}
              onRatingChange={(rating) => setFormData(prev => ({ ...prev, overallRating: rating }))}
              label="Overall Rating *"
            />

            {/* Category Ratings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StarRating
                rating={formData.qualityRating}
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, qualityRating: rating }))}
                label="Quality of Work"
              />
              <StarRating
                rating={formData.timelinessRating}
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, timelinessRating: rating }))}
                label="Timeliness"
              />
              <StarRating
                rating={formData.communicationRating}
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, communicationRating: rating }))}
                label="Communication"
              />
              <StarRating
                rating={formData.professionalismRating}
                onRatingChange={(rating) => setFormData(prev => ({ ...prev, professionalismRating: rating }))}
                label="Professionalism"
              />
            </div>

            {/* Comments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments
              </label>
              <textarea
                rows={4}
                value={formData.comments}
                onChange={(e) => setFormData(prev => ({ ...prev, comments: e.target.value }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Share your experience working with this vendor..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createReviewMutation.isPending || formData.overallRating === 0}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createReviewMutation.isPending ? 'Adding...' : 'Add Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
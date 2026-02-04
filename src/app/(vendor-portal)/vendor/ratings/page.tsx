'use client'

import { useQuery } from '@tanstack/react-query'
import { useVendorAuthStore } from '@/store/vendor-auth'
import { Star, MessageSquare } from 'lucide-react'

async function fetchRatings(token: string) {
  const response = await fetch('/api/vendor-portal/ratings', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch ratings')
  return response.json()
}

export default function VendorRatingsPage() {
  const { token } = useVendorAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-ratings'],
    queryFn: () => fetchRatings(token!),
    enabled: !!token,
  })

  const reviews = data?.reviews || []
  const averageRatings = data?.averageRatings
  const ratingDistribution = data?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const totalReviews = data?.totalReviews || 0

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= Math.round(rating)
                ? 'text-yellow-400 fill-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  const maxDistribution = Math.max(...Object.values(ratingDistribution) as number[])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Ratings & Reviews</h1>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <>
          {/* Rating Summary */}
          {averageRatings && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Overall Rating */}
                <div className="text-center md:text-left md:border-r md:pr-8">
                  <div className="flex items-center justify-center md:justify-start gap-4">
                    <div className="text-5xl font-bold text-gray-900">
                      {averageRatings.overall.toFixed(1)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-6 h-6 ${
                              star <= Math.round(averageRatings.overall)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Rating Distribution */}
                  <div className="mt-6 space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 w-3">{rating}</span>
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-400 rounded-full"
                            style={{
                              width: maxDistribution > 0
                                ? `${(ratingDistribution[rating as keyof typeof ratingDistribution] / maxDistribution) * 100}%`
                                : '0%'
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-500 w-8 text-right">
                          {ratingDistribution[rating as keyof typeof ratingDistribution]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Ratings */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Rating Breakdown</h3>
                  {[
                    { label: 'Quality', value: averageRatings.quality },
                    { label: 'Timeliness', value: averageRatings.timeliness },
                    { label: 'Communication', value: averageRatings.communication },
                    { label: 'Professionalism', value: averageRatings.professionalism },
                  ].map(
                    (item) =>
                      item.value !== null && (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">{item.label}</span>
                          <div className="flex items-center gap-2">
                            {renderStars(item.value)}
                            <span className="text-sm font-medium text-gray-900">
                              {item.value.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      )
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">All Reviews</h2>
            </div>

            {reviews.length === 0 ? (
              <div className="p-8 text-center">
                <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No reviews yet</p>
              </div>
            ) : (
              <div className="divide-y">
                {reviews.map((review: any) => (
                  <div key={review.id} className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        {renderStars(review.overallRating)}
                        {review.project && (
                          <p className="text-sm text-gray-500 mt-1">
                            Project: {review.project.title}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Individual Ratings */}
                    <div className="flex flex-wrap gap-4 mb-3 text-sm">
                      {review.qualityRating && (
                        <span className="text-gray-600">
                          Quality: <span className="font-medium">{review.qualityRating}</span>
                        </span>
                      )}
                      {review.timelinessRating && (
                        <span className="text-gray-600">
                          Timeliness: <span className="font-medium">{review.timelinessRating}</span>
                        </span>
                      )}
                      {review.communicationRating && (
                        <span className="text-gray-600">
                          Communication: <span className="font-medium">{review.communicationRating}</span>
                        </span>
                      )}
                      {review.professionalismRating && (
                        <span className="text-gray-600">
                          Professionalism: <span className="font-medium">{review.professionalismRating}</span>
                        </span>
                      )}
                    </div>

                    {review.comments && (
                      <div className="flex items-start gap-2 mt-3 p-3 bg-gray-50 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5" />
                        <p className="text-sm text-gray-700">{review.comments}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

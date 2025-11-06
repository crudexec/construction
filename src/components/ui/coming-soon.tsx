import { Construction } from 'lucide-react'

interface ComingSoonProps {
  title: string
  description: string
  features?: string[]
}

export function ComingSoon({ title, description, features }: ComingSoonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <Construction className="h-16 w-16 text-gray-400 mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
      <p className="text-gray-600 mb-8 max-w-2xl">{description}</p>
      
      {features && features.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-6 max-w-2xl w-full">
          <h3 className="font-semibold text-gray-900 mb-4">Coming Soon:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-sm text-gray-500 mt-8">
        This feature is currently in development and will be available soon.
      </p>
    </div>
  )
}
'use client'

import { TrendingUp, Users, DollarSign, FolderOpen } from 'lucide-react'

const stats = [
  { name: 'Total Leads', value: '24', change: '+12%', icon: Users, color: 'bg-blue-500' },
  { name: 'Active Projects', value: '8', change: '+3', icon: FolderOpen, color: 'bg-green-500' },
  { name: 'Revenue', value: '$128,430', change: '+15%', icon: DollarSign, color: 'bg-purple-500' },
  { name: 'Conversion Rate', value: '32%', change: '+4%', icon: TrendingUp, color: 'bg-orange-500' },
]

export function Stats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6"
        >
          <dt>
            <div className={`absolute rounded-md p-3 ${stat.color}`}>
              <stat.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <p className="ml-16 truncate text-sm font-medium text-gray-500">{stat.name}</p>
          </dt>
          <dd className="ml-16 flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            <p className="ml-2 flex items-baseline text-sm font-semibold text-green-600">
              {stat.change}
            </p>
          </dd>
        </div>
      ))}
    </div>
  )
}
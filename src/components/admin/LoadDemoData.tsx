'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { AlertTriangle, Database, Loader2, CheckCircle, Users, FolderOpen, ClipboardList } from 'lucide-react'

export default function LoadDemoData() {
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  const handleLoadDemoData = async () => {
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/admin/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        toast.success('Demo data loaded successfully!')
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        throw new Error(data.error || 'Failed to load demo data')
      }
    } catch (error) {
      console.error('Error loading demo data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load demo data')
    } finally {
      setIsLoading(false)
      setShowConfirm(false)
    }
  }

  if (result) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
        <div className="flex items-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-500 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">Demo Data Loaded Successfully!</h2>
        </div>
        
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Login Credentials:</h3>
            <div className="space-y-2 font-mono text-sm">
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">Admin:</span>
                <span className="text-green-700">{result.credentials.admin}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">Staff:</span>
                <span className="text-green-700">{result.credentials.staff}</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-600 mr-2">Subcontractor:</span>
                <span className="text-green-700">{result.credentials.subcontractor}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-gray-700 font-semibold">Users Created</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{result.stats.users}</p>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <FolderOpen className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-gray-700 font-semibold">Projects Created</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{result.stats.projects}</p>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <ClipboardList className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-gray-700 font-semibold">Pipeline Stages</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{result.stats.stages}</p>
            </div>
            
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Database className="h-5 w-5 text-indigo-600 mr-2" />
                <span className="text-gray-700 font-semibold">Company</span>
              </div>
              <p className="text-lg font-bold text-indigo-600">{result.stats.company}</p>
            </div>
          </div>

          <p className="text-center text-gray-600 mt-4">
            Redirecting to login page in 3 seconds...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg mx-auto">
      <div className="flex items-center mb-4">
        <Database className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Load Demo Data</h2>
      </div>
      
      {!showConfirm ? (
        <>
          <p className="text-gray-600 mb-6">
            Load sample data to demonstrate all features of the CRM to prospective clients. 
            This includes sample projects, tasks, documents, estimates, and more.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">What will be created:</h3>
            <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
              <li>1 Company (BuildPro Construction)</li>
              <li>4 Users (Admin, Staff, Subcontractor)</li>
              <li>7 Pipeline stages</li>
              <li>5 Projects in various stages</li>
              <li>Tasks, documents, budgets for each project</li>
              <li>Sample estimates and messages</li>
              <li>Daily logs and activity history</li>
              <li>Project templates for future use</li>
            </ul>
          </div>
          
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Database className="h-5 w-5 mr-2" />
            Load Demo Data
          </button>
        </>
      ) : (
        <>
          <div className="bg-yellow-50 border border-yellow-400 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Warning</h3>
                <p className="text-sm text-yellow-800">
                  This will delete ALL existing data and replace it with demo data. 
                  This action cannot be undone. Are you sure you want to continue?
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
              className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            
            <button
              onClick={handleLoadDemoData}
              disabled={isLoading}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Yes, Load Demo Data
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
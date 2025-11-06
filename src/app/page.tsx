import Link from 'next/link'
import { Building2, CheckCircle, ArrowRight } from 'lucide-react'

export default function HomePage() {
  const features = [
    'Drag-and-drop kanban board for lead management',
    'Comprehensive project tracking and task management',
    'Document management with secure sharing',
    'Detailed estimates and budget tracking',
    'Team collaboration and subcontractor portal',
    'Client communication and feedback system',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">BuildFlow CRM</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-gray-700 hover:text-primary-600 font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 font-medium"
            >
              Get Started
            </Link>
          </div>
        </nav>

        <div className="py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Modern CRM for Construction Companies
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your project management, track leads, manage teams, and deliver projects on time with our comprehensive construction CRM solution.
            </p>
            <div className="flex justify-center space-x-4">
              <Link
                href="/register"
                className="bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 font-medium text-lg flex items-center"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link
                href="/login"
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-50 font-medium text-lg"
              >
                View Demo
              </Link>
            </div>
          </div>

          <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-500 mt-0.5" />
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-20 bg-white rounded-lg shadow-xl p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Everything You Need to Manage Your Construction Business
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-600">1</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Capture Leads</h3>
                <p className="text-gray-600">
                  Track and manage leads through customizable pipeline stages
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-600">2</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Manage Projects</h3>
                <p className="text-gray-600">
                  Organize tasks, documents, and team collaboration in one place
                </p>
              </div>
              <div className="text-center">
                <div className="bg-primary-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary-600">3</span>
                </div>
                <h3 className="font-semibold text-lg mb-2">Deliver Success</h3>
                <p className="text-gray-600">
                  Complete projects on time and budget with powerful tracking tools
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="py-8 mt-20 border-t border-gray-200">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 BuildFlow CRM. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
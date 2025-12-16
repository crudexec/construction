import LoadDemoData from '@/components/admin/LoadDemoData'

export default function DemoDataPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Demo Data Management</h1>
          <p className="mt-2 text-lg text-gray-600">
            Load sample data to demonstrate the CRM features
          </p>
        </div>
        
        <LoadDemoData />
        
        <div className="mt-12 bg-gray-100 rounded-lg p-6 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">About Demo Data</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              The demo data provides a realistic example of how the CRM works with actual construction projects.
              It includes multiple projects at different stages, from initial leads to completed work.
            </p>
            <p className="font-semibold text-gray-700 mt-3">Features Demonstrated:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Pipeline management with drag-and-drop functionality</li>
              <li>Project tracking with tasks and categories</li>
              <li>Document management with folders</li>
              <li>Budget tracking and estimates</li>
              <li>Client communication and messaging</li>
              <li>Daily logs and progress photos</li>
              <li>Team collaboration features</li>
              <li>Bid request management</li>
              <li>Walkaround recordings and reports</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
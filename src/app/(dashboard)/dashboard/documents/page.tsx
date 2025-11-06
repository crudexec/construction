import { ComingSoon } from '@/components/ui/coming-soon'

export default function DocumentsPage() {
  return (
    <ComingSoon
      title="Documents"
      description="Store, organize, and share project documents, contracts, and files securely."
      features={[
        'File upload and storage',
        'Folder organization system',
        'Document sharing with clients',
        'Version control and history',
        'Digital signature collection',
        'PDF preview and annotation',
        'Search across all documents',
        'Access control and permissions'
      ]}
    />
  )
}
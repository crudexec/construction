import { ComingSoon } from '@/components/ui/coming-soon'

export default function MessagesPage() {
  return (
    <ComingSoon
      title="Messages"
      description="Communicate with clients, team members, and subcontractors in one central hub."
      features={[
        'Client communication threads',
        'Team messaging and collaboration',
        'Project-specific discussions',
        'File sharing in conversations',
        'Real-time notifications',
        'Message templates and quick replies',
        'Integration with email',
        'Message history and search'
      ]}
    />
  )
}
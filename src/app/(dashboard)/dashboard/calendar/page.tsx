import { ComingSoon } from '@/components/ui/coming-soon'

export default function CalendarPage() {
  return (
    <ComingSoon
      title="Calendar"
      description="Schedule and manage appointments, project deadlines, and team availability."
      features={[
        'Appointment scheduling',
        'Project deadline tracking',
        'Team availability calendar',
        'Recurring events and reminders',
        'Integration with project timelines',
        'Client meeting scheduling',
        'Resource booking system',
        'Calendar sync with external apps'
      ]}
    />
  )
}
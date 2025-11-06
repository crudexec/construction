import { ComingSoon } from '@/components/ui/coming-soon'

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Generate insights and analytics about your business performance and project metrics."
      features={[
        'Lead conversion analytics',
        'Project profitability reports',
        'Team performance metrics',
        'Revenue and expense tracking',
        'Client satisfaction scores',
        'Pipeline velocity analysis',
        'Custom report builder',
        'Export to PDF and Excel'
      ]}
    />
  )
}
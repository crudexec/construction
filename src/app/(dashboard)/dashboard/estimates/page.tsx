import { ComingSoon } from '@/components/ui/coming-soon'

export default function EstimatesPage() {
  return (
    <ComingSoon
      title="Estimates"
      description="Create detailed estimates and proposals for your construction projects."
      features={[
        'Itemized estimate creation',
        'Material and labor cost tracking',
        'Professional PDF generation',
        'Digital signature collection',
        'Estimate templates and presets',
        'Client approval workflow',
        'Cost comparison tools',
        'Integration with project budgets'
      ]}
    />
  )
}
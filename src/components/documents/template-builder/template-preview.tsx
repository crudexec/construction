'use client'

import { useMemo } from 'react'
import { DocumentTemplateType } from '@prisma/client'
import { getVariablesForType } from '@/lib/documents'

interface TemplatePreviewProps {
  content: string
  documentType: DocumentTemplateType
}

// Sample data for preview
const SAMPLE_DATA: Record<string, string> = {
  '{{changeOrder.number}}': 'CO-CON-2026-001-1',
  '{{changeOrder.title}}': 'Additional Electrical Work',
  '{{changeOrder.description}}': 'Installation of additional power outlets in the main conference room as requested by the client.',
  '{{changeOrder.reason}}': 'Client requested additional power outlets for new equipment installation.',
  '{{changeOrder.totalAmount}}': '$5,250.00',
  '{{changeOrder.status}}': 'APPROVED',
  '{{changeOrder.createdDate}}': 'March 1, 2026',
  '{{changeOrder.submittedDate}}': 'March 2, 2026',
  '{{changeOrder.approvedDate}}': 'March 5, 2026',
  '{{contract.number}}': 'CON-2026-001',
  '{{contract.totalSum}}': '$150,000.00',
  '{{contract.type}}': 'Lump Sum',
  '{{vendor.name}}': 'John Smith',
  '{{vendor.companyName}}': 'ABC Electrical Services LLC',
  '{{vendor.email}}': 'jsmith@abcelectrical.com',
  '{{vendor.phone}}': '(555) 123-4567',
  '{{vendor.address}}': '123 Main Street',
  '{{vendor.cityStateZip}}': 'Austin, TX 78701',
  '{{vendor.licenseNumber}}': 'ELEC-12345',
  '{{company.name}}': 'Your Construction Company',
  '{{company.address}}': '456 Business Avenue, Suite 100',
  '{{company.cityStateZip}}': 'Houston, TX 77001',
  '{{company.phone}}': '(555) 987-6543',
  '{{company.email}}': 'info@yourcompany.com',
  '{{createdBy.name}}': 'Jane Doe',
  '{{approvedBy.name}}': 'Mike Johnson',
  '{{today}}': new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }),
  '{{currentYear}}': new Date().getFullYear().toString(),
  '{{lineItems.table}}': `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left;">Description</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Qty</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">Unit</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Unit Price</th>
          <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 8px;">Install 20A duplex outlet</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">4</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">EA</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$350.00</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$1,400.00</td>
        </tr>
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 8px;">Run new circuit from panel</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">2</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">EA</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$850.00</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$1,700.00</td>
        </tr>
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 8px;">Labor - Electrician</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">12</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">HR</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$125.00</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$1,500.00</td>
        </tr>
        <tr>
          <td style="border: 1px solid #d1d5db; padding: 8px;">Permits and inspections</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">1</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: center;">LS</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$650.00</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$650.00</td>
        </tr>
      </tbody>
      <tfoot>
        <tr style="background-color: #f3f4f6; font-weight: bold;">
          <td colspan="4" style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">Total:</td>
          <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$5,250.00</td>
        </tr>
      </tfoot>
    </table>
  `,
}

export function TemplatePreview({ content, documentType }: TemplatePreviewProps) {
  // Substitute variables with sample data
  const renderedContent = useMemo(() => {
    let result = content

    // Replace all known variables with sample data
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      result = result.split(key).join(value)
    })

    // Highlight any remaining unsubstituted variables
    result = result.replace(
      /\{\{[a-zA-Z0-9_.]+\}\}/g,
      '<span style="background-color: #fef3c7; color: #92400e; padding: 0 4px; border-radius: 2px;">$&</span>'
    )

    return result
  }, [content])

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 bg-gray-100 border-b">
        <h3 className="text-sm font-medium text-gray-700">
          Preview (with sample data)
        </h3>
        <p className="text-xs text-gray-500">
          Unrecognized variables are highlighted in yellow
        </p>
      </div>

      {/* Preview Content */}
      <div className="p-6 bg-white min-h-[400px]">
        {content ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <div className="text-center text-gray-400 py-12">
            Start typing in the editor to see a preview
          </div>
        )}
      </div>
    </div>
  )
}

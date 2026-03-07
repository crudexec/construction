import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/currency'
import { ChangeOrderData, VariableResolver } from '../types'

/**
 * Fetch change order data and prepare it for variable substitution
 */
export async function fetchChangeOrderData(
  changeOrderId: string,
  companyId: string
): Promise<ChangeOrderData | null> {
  const changeOrder = await prisma.changeOrder.findFirst({
    where: {
      id: changeOrderId,
      contract: {
        vendor: {
          companyId,
        },
      },
    },
    include: {
      lineItems: {
        orderBy: { order: 'asc' },
      },
      contract: {
        include: {
          vendor: true,
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      approvedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  })

  if (!changeOrder) return null

  // Fetch company info
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      phone: true,
      email: true,
      currency: true,
    },
  })

  if (!company) return null

  const currency = company.currency || 'USD'

  // Format vendor address
  const vendorCityStateZip = [
    changeOrder.contract.vendor.city,
    changeOrder.contract.vendor.state,
    changeOrder.contract.vendor.zipCode,
  ]
    .filter(Boolean)
    .join(', ')

  // Format company address
  const companyCityStateZip = [company.city, company.state, company.zipCode]
    .filter(Boolean)
    .join(', ')

  // Format dates
  const formatDate = (date: Date | null): string => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Contract type label
  const contractTypeLabels: Record<string, string> = {
    LUMP_SUM: 'Lump Sum',
    REMEASURABLE: 'Remeasurable (Unit Price)',
    ADDENDUM: 'Addendum',
  }

  return {
    changeOrder: {
      number: `CO-${changeOrder.contract.contractNumber}-${changeOrder.changeOrderNumber}`,
      title: changeOrder.title,
      description: changeOrder.description,
      reason: changeOrder.reason,
      totalAmount: changeOrder.totalAmount,
      status: changeOrder.status,
      createdDate: formatDate(changeOrder.createdAt),
      submittedDate: formatDate(changeOrder.submittedAt),
      approvedDate: formatDate(changeOrder.approvedAt),
    },
    contract: {
      number: changeOrder.contract.contractNumber,
      totalSum: changeOrder.contract.totalSum,
      type: contractTypeLabels[changeOrder.contract.type] || changeOrder.contract.type,
    },
    vendor: {
      name: changeOrder.contract.vendor.name,
      companyName: changeOrder.contract.vendor.companyName,
      email: changeOrder.contract.vendor.email,
      phone: changeOrder.contract.vendor.phone,
      address: changeOrder.contract.vendor.address,
      cityStateZip: vendorCityStateZip,
      licenseNumber: changeOrder.contract.vendor.licenseNumber,
    },
    company: {
      name: company.name,
      address: company.address,
      cityStateZip: companyCityStateZip,
      phone: company.phone,
      email: company.email,
    },
    createdBy: {
      name: `${changeOrder.createdBy.firstName} ${changeOrder.createdBy.lastName}`,
    },
    approvedBy: changeOrder.approvedBy
      ? {
          name: `${changeOrder.approvedBy.firstName} ${changeOrder.approvedBy.lastName}`,
        }
      : null,
    lineItems: changeOrder.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      notes: item.notes,
    })),
    today: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    currentYear: new Date().getFullYear().toString(),
  }
}

/**
 * Convert change order data to a variable resolver map
 */
export function changeOrderToVariables(
  data: ChangeOrderData,
  currency: string = 'USD'
): VariableResolver {
  return {
    // Change Order
    '{{changeOrder.number}}': data.changeOrder.number,
    '{{changeOrder.title}}': data.changeOrder.title,
    '{{changeOrder.description}}': data.changeOrder.description || '',
    '{{changeOrder.reason}}': data.changeOrder.reason || '',
    '{{changeOrder.totalAmount}}': formatCurrency(data.changeOrder.totalAmount, currency),
    '{{changeOrder.status}}': data.changeOrder.status,
    '{{changeOrder.createdDate}}': data.changeOrder.createdDate,
    '{{changeOrder.submittedDate}}': data.changeOrder.submittedDate || '',
    '{{changeOrder.approvedDate}}': data.changeOrder.approvedDate || '',

    // Contract
    '{{contract.number}}': data.contract.number,
    '{{contract.totalSum}}': formatCurrency(data.contract.totalSum, currency),
    '{{contract.type}}': data.contract.type,

    // Vendor
    '{{vendor.name}}': data.vendor.name,
    '{{vendor.companyName}}': data.vendor.companyName,
    '{{vendor.email}}': data.vendor.email || '',
    '{{vendor.phone}}': data.vendor.phone || '',
    '{{vendor.address}}': data.vendor.address || '',
    '{{vendor.cityStateZip}}': data.vendor.cityStateZip,
    '{{vendor.licenseNumber}}': data.vendor.licenseNumber || '',

    // Company
    '{{company.name}}': data.company.name,
    '{{company.address}}': data.company.address || '',
    '{{company.cityStateZip}}': data.company.cityStateZip,
    '{{company.phone}}': data.company.phone || '',
    '{{company.email}}': data.company.email || '',

    // People
    '{{createdBy.name}}': data.createdBy.name,
    '{{approvedBy.name}}': data.approvedBy?.name || '',

    // Dates
    '{{today}}': data.today,
    '{{currentYear}}': data.currentYear,

    // Line Items Table (special handling)
    '{{lineItems.table}}': generateLineItemsTable(data.lineItems, currency),
  }
}

/**
 * Generate HTML table for line items
 */
function generateLineItemsTable(
  lineItems: ChangeOrderData['lineItems'],
  currency: string
): string {
  if (lineItems.length === 0) {
    return '<p><em>No line items</em></p>'
  }

  const total = lineItems.reduce((sum, item) => sum + item.totalPrice, 0)

  let html = `
    <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px;">
      <thead>
        <tr style="background-color: #f3f4f6;">
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: left; font-weight: 600;">Description</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right; width: 80px; font-weight: 600;">Qty</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: center; width: 60px; font-weight: 600;">Unit</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right; width: 100px; font-weight: 600;">Unit Price</th>
          <th style="border: 1px solid #d1d5db; padding: 10px; text-align: right; width: 100px; font-weight: 600;">Total</th>
        </tr>
      </thead>
      <tbody>
  `

  lineItems.forEach((item, index) => {
    const bgColor = index % 2 === 0 ? '#ffffff' : '#f9fafb'
    html += `
        <tr style="background-color: ${bgColor};">
          <td style="border: 1px solid #d1d5db; padding: 10px;">${escapeHtml(item.description)}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${item.quantity}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px; text-align: center;">${escapeHtml(item.unit)}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${formatCurrency(item.unitPrice, currency)}</td>
          <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${formatCurrency(item.totalPrice, currency)}</td>
        </tr>
    `
  })

  html += `
      </tbody>
      <tfoot>
        <tr style="background-color: #f3f4f6; font-weight: 600;">
          <td colspan="4" style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">Total:</td>
          <td style="border: 1px solid #d1d5db; padding: 10px; text-align: right;">${formatCurrency(total, currency)}</td>
        </tr>
      </tfoot>
    </table>
  `

  return html
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

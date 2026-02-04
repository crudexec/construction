import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency } from '@/lib/currency'

interface EstimateItem {
  id: string
  name: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number
  total: number
  order: number
}

interface Estimate {
  id: string
  estimateNumber: string
  title: string
  description?: string
  subtotal: number
  tax: number
  discount: number
  total: number
  status: string
  validUntil?: string
  createdAt: string
  items: EstimateItem[]
}

interface Project {
  title: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  projectAddress?: string
  projectCity?: string
  projectState?: string
  projectZipCode?: string
}

export function generateEstimatePDF(estimate: Estimate, project: Project, companyInfo?: any, currencyCode: string = 'USD') {
  const doc = new jsPDF()
  
  // Company header
  doc.setFontSize(20)
  doc.setTextColor(40, 40, 40)
  doc.text('ESTIMATE', 20, 25)
  
  // Company info (if available)
  if (companyInfo?.name) {
    doc.setFontSize(12)
    doc.text(companyInfo.name, 20, 35)
    if (companyInfo.address) doc.text(companyInfo.address, 20, 42)
    if (companyInfo.phone) doc.text(`Phone: ${companyInfo.phone}`, 20, 49)
    if (companyInfo.email) doc.text(`Email: ${companyInfo.email}`, 20, 56)
  }
  
  // Estimate info
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  
  const estimateInfoY = companyInfo?.name ? 70 : 40
  doc.text(`Estimate #: ${estimate.estimateNumber}`, 120, estimateInfoY)
  doc.text(`Date: ${new Date(estimate.createdAt).toLocaleDateString()}`, 120, estimateInfoY + 7)
  if (estimate.validUntil) {
    doc.text(`Valid Until: ${new Date(estimate.validUntil).toLocaleDateString()}`, 120, estimateInfoY + 14)
  }
  doc.text(`Status: ${estimate.status}`, 120, estimateInfoY + 21)
  
  // Project/Client info
  const clientInfoY = estimateInfoY + 35
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text('Project Information:', 20, clientInfoY)
  
  doc.setFontSize(12)
  doc.setTextColor(0, 0, 0)
  let currentY = clientInfoY + 10
  
  doc.text(`Project: ${project.title}`, 20, currentY)
  currentY += 7
  
  if (project.contactName) {
    doc.text(`Contact: ${project.contactName}`, 20, currentY)
    currentY += 7
  }
  
  if (project.contactEmail) {
    doc.text(`Email: ${project.contactEmail}`, 20, currentY)
    currentY += 7
  }
  
  if (project.contactPhone) {
    doc.text(`Phone: ${project.contactPhone}`, 20, currentY)
    currentY += 7
  }
  
  if (project.projectAddress) {
    const fullAddress = [
      project.projectAddress,
      project.projectCity,
      project.projectState,
      project.projectZipCode
    ].filter(Boolean).join(', ')
    doc.text(`Address: ${fullAddress}`, 20, currentY)
    currentY += 7
  }
  
  // Estimate title and description
  currentY += 10
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.text(`Estimate: ${estimate.title}`, 20, currentY)
  currentY += 10
  
  if (estimate.description) {
    doc.setFontSize(11)
    doc.setTextColor(60, 60, 60)
    const splitDescription = doc.splitTextToSize(estimate.description, 170)
    doc.text(splitDescription, 20, currentY)
    currentY += splitDescription.length * 5 + 10
  }
  
  // Line items table
  const tableData = estimate.items.map(item => [
    item.name + (item.description ? `\n${item.description}` : ''),
    item.quantity.toString(),
    item.unit,
    formatCurrency(item.unitPrice, currencyCode),
    formatCurrency(item.total, currencyCode)
  ])
  
  autoTable(doc, {
    head: [['Item', 'Qty', 'Unit', 'Unit Price', 'Total']],
    body: tableData,
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [66, 102, 245], // Primary blue color
      textColor: 255,
      fontSize: 12,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 10,
      textColor: 50
    },
    columnStyles: {
      0: { cellWidth: 60 }, // Item name
      1: { cellWidth: 20, halign: 'center' }, // Quantity
      2: { cellWidth: 25, halign: 'center' }, // Unit
      3: { cellWidth: 35, halign: 'right' }, // Unit Price
      4: { cellWidth: 35, halign: 'right' } // Total
    },
    margin: { left: 20, right: 20 }
  })
  
  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY + 20
  
  // Totals section
  const totalsX = 120
  let totalsY = finalY
  
  doc.setFontSize(11)
  doc.setTextColor(60, 60, 60)

  doc.text('Subtotal:', totalsX, totalsY)
  doc.text(formatCurrency(estimate.subtotal, currencyCode), totalsX + 50, totalsY, { align: 'right' })
  totalsY += 7

  if (estimate.tax > 0) {
    doc.text('Tax:', totalsX, totalsY)
    doc.text(formatCurrency(estimate.tax, currencyCode), totalsX + 50, totalsY, { align: 'right' })
    totalsY += 7
  }

  if (estimate.discount > 0) {
    doc.text('Discount:', totalsX, totalsY)
    doc.text(`-${formatCurrency(estimate.discount, currencyCode).replace(/^[^\d-]/, '')}`, totalsX + 50, totalsY, { align: 'right' })
    totalsY += 7
  }

  // Total line
  doc.setFontSize(14)
  doc.setTextColor(40, 40, 40)
  doc.setLineWidth(0.5)
  doc.line(totalsX, totalsY + 2, totalsX + 50, totalsY + 2)

  totalsY += 10
  doc.text('Total:', totalsX, totalsY)
  doc.text(formatCurrency(estimate.total, currencyCode), totalsX + 50, totalsY, { align: 'right' })
  
  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, pageHeight - 20)
  
  // Download the PDF
  const fileName = `estimate-${estimate.estimateNumber}-${estimate.title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
  doc.save(fileName)
}
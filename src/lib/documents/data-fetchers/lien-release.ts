import { prisma } from '@/lib/prisma'
import { formatCurrency } from '@/lib/currency'
import { LienReleaseData, VariableResolver } from '../types'

function getAbsoluteUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

function formatDate(date: Date | null): string | null {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const lienReleaseTypeLabels: Record<string, string> = {
  CONDITIONAL_PROGRESS: 'Conditional Progress Release',
  UNCONDITIONAL_PROGRESS: 'Unconditional Progress Release',
  CONDITIONAL_FINAL: 'Conditional Final Release',
  UNCONDITIONAL_FINAL: 'Unconditional Final Release',
}

const contractTypeLabels: Record<string, string> = {
  LUMP_SUM: 'Lump Sum',
  REMEASURABLE: 'Remeasurable (Unit Price)',
  ADDENDUM: 'Addendum',
}

export async function fetchLienReleaseData(
  lienReleaseId: string,
  companyId: string
): Promise<LienReleaseData | null> {
  const lienRelease = await prisma.lienRelease.findFirst({
    where: {
      id: lienReleaseId,
      companyId,
    },
    include: {
      vendor: true,
      contract: true,
      project: {
        select: {
          title: true,
        },
      },
      requestedBy: {
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

  if (!lienRelease) return null

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      logo: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      phone: true,
      email: true,
    },
  })

  if (!company) return null

  const vendorCityStateZip = [
    lienRelease.vendor.city,
    lienRelease.vendor.state,
    lienRelease.vendor.zipCode,
  ]
    .filter(Boolean)
    .join(', ')

  const companyCityStateZip = [company.city, company.state, company.zipCode]
    .filter(Boolean)
    .join(', ')

  return {
    vendorId: lienRelease.vendor.id,
    lienRelease: {
      id: lienRelease.id,
      type: lienRelease.type,
      typeLabel: lienReleaseTypeLabels[lienRelease.type] || lienRelease.type,
      status: lienRelease.status,
      title: lienRelease.title,
      amount: lienRelease.amount,
      throughDate: formatDate(lienRelease.throughDate),
      effectiveDate: formatDate(lienRelease.effectiveDate),
      externalPaymentRef: lienRelease.externalPaymentRef,
      externalSource: lienRelease.externalSource,
      notes: lienRelease.notes,
      requestedDate: formatDate(lienRelease.requestedAt),
      approvedDate: formatDate(lienRelease.approvedAt),
    },
    contract: {
      number: lienRelease.contract?.contractNumber || null,
      totalSum: lienRelease.contract?.totalSum ?? null,
      type: lienRelease.contract?.type
        ? contractTypeLabels[lienRelease.contract.type] || lienRelease.contract.type
        : null,
    },
    project: {
      title: lienRelease.project?.title || null,
    },
    vendor: {
      name: lienRelease.vendor.name,
      companyName: lienRelease.vendor.companyName,
      email: lienRelease.vendor.email,
      phone: lienRelease.vendor.phone,
      address: lienRelease.vendor.address,
      cityStateZip: vendorCityStateZip,
      licenseNumber: lienRelease.vendor.licenseNumber,
    },
    company: {
      name: company.name,
      logo: company.logo,
      address: company.address,
      cityStateZip: companyCityStateZip,
      phone: company.phone,
      email: company.email,
    },
    requestedBy: lienRelease.requestedBy
      ? {
          name: `${lienRelease.requestedBy.firstName} ${lienRelease.requestedBy.lastName}`,
        }
      : null,
    approvedBy: lienRelease.approvedBy
      ? {
          name: `${lienRelease.approvedBy.firstName} ${lienRelease.approvedBy.lastName}`,
        }
      : null,
    today: new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    currentYear: new Date().getFullYear().toString(),
  }
}

export function lienReleaseToVariables(
  data: LienReleaseData,
  currency: string = 'USD'
): VariableResolver {
  return {
    '{{lienRelease.id}}': data.lienRelease.id,
    '{{lienRelease.type}}': data.lienRelease.type,
    '{{lienRelease.typeLabel}}': data.lienRelease.typeLabel,
    '{{lienRelease.status}}': data.lienRelease.status,
    '{{lienRelease.title}}': data.lienRelease.title || '',
    '{{lienRelease.amount}}': data.lienRelease.amount !== null
      ? formatCurrency(data.lienRelease.amount, currency)
      : '',
    '{{lienRelease.throughDate}}': data.lienRelease.throughDate || '',
    '{{lienRelease.effectiveDate}}': data.lienRelease.effectiveDate || '',
    '{{lienRelease.externalPaymentRef}}': data.lienRelease.externalPaymentRef || '',
    '{{lienRelease.externalSource}}': data.lienRelease.externalSource || '',
    '{{lienRelease.notes}}': data.lienRelease.notes || '',
    '{{lienRelease.requestedDate}}': data.lienRelease.requestedDate || '',
    '{{lienRelease.approvedDate}}': data.lienRelease.approvedDate || '',

    '{{contract.number}}': data.contract.number || '',
    '{{contract.totalSum}}': data.contract.totalSum !== null
      ? formatCurrency(data.contract.totalSum, currency)
      : '',
    '{{contract.type}}': data.contract.type || '',

    '{{project.title}}': data.project.title || '',

    '{{vendor.name}}': data.vendor.name,
    '{{vendor.companyName}}': data.vendor.companyName,
    '{{vendor.email}}': data.vendor.email || '',
    '{{vendor.phone}}': data.vendor.phone || '',
    '{{vendor.address}}': data.vendor.address || '',
    '{{vendor.cityStateZip}}': data.vendor.cityStateZip,
    '{{vendor.licenseNumber}}': data.vendor.licenseNumber || '',

    '{{company.name}}': data.company.name,
    '{{company.logo}}': data.company.logo
      ? `<img src="${getAbsoluteUrl(data.company.logo)}" alt="${data.company.name}" style="max-height: 60px; max-width: 200px;" crossorigin="anonymous" />`
      : '',
    '{{company.address}}': data.company.address || '',
    '{{company.cityStateZip}}': data.company.cityStateZip,
    '{{company.phone}}': data.company.phone || '',
    '{{company.email}}': data.company.email || '',

    '{{requestedBy.name}}': data.requestedBy?.name || '',
    '{{approvedBy.name}}': data.approvedBy?.name || '',

    '{{today}}': data.today,
    '{{currentYear}}': data.currentYear,
  }
}

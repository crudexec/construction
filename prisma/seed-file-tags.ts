import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default file tags organized by category
const DEFAULT_TAGS = [
  // Document Type
  { name: 'Contract', category: 'Document Type', color: '#3b82f6', description: 'Contract documents' },
  { name: 'Invoice', category: 'Document Type', color: '#22c55e', description: 'Invoice documents' },
  { name: 'Quote', category: 'Document Type', color: '#8b5cf6', description: 'Price quotes and estimates' },
  { name: 'Receipt', category: 'Document Type', color: '#14b8a6', description: 'Payment receipts' },
  { name: 'Report', category: 'Document Type', color: '#64748b', description: 'Reports and summaries' },
  { name: 'Permit', category: 'Document Type', color: '#f97316', description: 'Permits and approvals' },
  { name: 'Insurance', category: 'Document Type', color: '#ef4444', description: 'Insurance documents' },
  { name: 'Photo', category: 'Document Type', color: '#0ea5e9', description: 'Photos and images' },
  { name: 'Drawing', category: 'Document Type', color: '#6366f1', description: 'Drawings and blueprints' },
  { name: 'Specification', category: 'Document Type', color: '#a855f7', description: 'Technical specifications' },
  { name: 'Certificate', category: 'Document Type', color: '#eab308', description: 'Certificates and licenses' },
  { name: 'Warranty', category: 'Document Type', color: '#0d9488', description: 'Warranty documents' },

  // Status
  { name: 'Draft', category: 'Status', color: '#94a3b8', description: 'Document in draft state' },
  { name: 'Final', category: 'Status', color: '#22c55e', description: 'Finalized document' },
  { name: 'Archived', category: 'Status', color: '#64748b', description: 'Archived document' },
  { name: 'Needs Review', category: 'Status', color: '#f59e0b', description: 'Document needs review' },
  { name: 'Approved', category: 'Status', color: '#10b981', description: 'Approved document' },
  { name: 'Rejected', category: 'Status', color: '#ef4444', description: 'Rejected document' },
  { name: 'Pending', category: 'Status', color: '#f97316', description: 'Pending approval/action' },
  { name: 'Expired', category: 'Status', color: '#dc2626', description: 'Expired document' },
  { name: 'Signed', category: 'Status', color: '#06b6d4', description: 'Signed document' },

  // Priority
  { name: 'High Priority', category: 'Priority', color: '#ef4444', description: 'High priority document' },
  { name: 'Normal', category: 'Priority', color: '#3b82f6', description: 'Normal priority' },
  { name: 'Low Priority', category: 'Priority', color: '#94a3b8', description: 'Low priority document' },
  { name: 'Urgent', category: 'Priority', color: '#dc2626', description: 'Urgent - requires immediate attention' },

  // Project Phase
  { name: 'Pre-Construction', category: 'Project Phase', color: '#8b5cf6', description: 'Pre-construction phase documents' },
  { name: 'Construction', category: 'Project Phase', color: '#f97316', description: 'Construction phase documents' },
  { name: 'Closeout', category: 'Project Phase', color: '#14b8a6', description: 'Project closeout documents' },
  { name: 'Warranty Period', category: 'Project Phase', color: '#0d9488', description: 'Warranty period documents' },
]

async function main() {
  console.log('🏷️  Seeding file tags...')

  // Get all companies
  const companies = await prisma.company.findMany({
    select: { id: true, name: true }
  })

  if (companies.length === 0) {
    console.log('❌ No companies found. Please run the main seed first.')
    return
  }

  console.log(`📦 Found ${companies.length} company(ies)`)

  for (const company of companies) {
    console.log(`\n🏢 Processing company: ${company.name}`)

    // Check existing tags
    const existingTags = await prisma.fileTag.findMany({
      where: { companyId: company.id },
      select: { name: true }
    })

    const existingNames = new Set(existingTags.map(t => t.name))
    console.log(`   Found ${existingTags.length} existing tags`)

    // Add missing tags
    let added = 0
    for (const tag of DEFAULT_TAGS) {
      if (!existingNames.has(tag.name)) {
        await prisma.fileTag.create({
          data: {
            name: tag.name,
            description: tag.description,
            color: tag.color,
            category: tag.category,
            companyId: company.id
          }
        })
        added++
      }
    }

    console.log(`   ✅ Added ${added} new tags`)
  }

  console.log('\n🎉 File tags seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding file tags:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

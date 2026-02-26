import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default service tags organized by category
const DEFAULT_TAGS = [
  // Service Type
  { name: 'New Construction', category: 'Service Type', color: '#3b82f6', description: 'New building construction' },
  { name: 'Renovation', category: 'Service Type', color: '#8b5cf6', description: 'Building renovation and remodeling' },
  { name: 'Tenant Improvement', category: 'Service Type', color: '#6366f1', description: 'Tenant build-out and improvements' },
  { name: 'Maintenance', category: 'Service Type', color: '#14b8a6', description: 'Ongoing maintenance services' },
  { name: 'Repair', category: 'Service Type', color: '#f97316', description: 'Repair and restoration work' },
  { name: 'Service Calls', category: 'Service Type', color: '#0ea5e9', description: 'On-call service and emergency repairs' },

  // Market Segment
  { name: 'Commercial', category: 'Market Segment', color: '#64748b', description: 'Commercial buildings and offices' },
  { name: 'Residential', category: 'Market Segment', color: '#22c55e', description: 'Residential homes and apartments' },
  { name: 'Industrial', category: 'Market Segment', color: '#78716c', description: 'Industrial facilities and warehouses' },
  { name: 'Healthcare', category: 'Market Segment', color: '#ef4444', description: 'Hospitals and medical facilities' },
  { name: 'Hospitality', category: 'Market Segment', color: '#ec4899', description: 'Hotels and restaurants' },
  { name: 'Retail', category: 'Market Segment', color: '#f43f5e', description: 'Retail stores and shopping centers' },
  { name: 'Education', category: 'Market Segment', color: '#eab308', description: 'Schools and educational institutions' },
  { name: 'Government', category: 'Market Segment', color: '#0d9488', description: 'Government and public sector' },
  { name: 'Multi-Family', category: 'Market Segment', color: '#a855f7', description: 'Multi-family residential complexes' },

  // Capability
  { name: 'Design-Build', category: 'Capability', color: '#6366f1', description: 'Design and construction services' },
  { name: 'Value Engineering', category: 'Capability', color: '#84cc16', description: 'Cost optimization expertise' },
  { name: 'Fast Track', category: 'Capability', color: '#f97316', description: 'Accelerated schedule capability' },
  { name: 'Prefabrication', category: 'Capability', color: '#0ea5e9', description: 'Prefab and modular construction' },
  { name: 'BIM Capable', category: 'Capability', color: '#8b5cf6', description: 'Building Information Modeling' },
  { name: '24/7 Emergency', category: 'Capability', color: '#ef4444', description: '24/7 emergency response' },
  { name: 'Union', category: 'Capability', color: '#64748b', description: 'Union labor workforce' },
  { name: 'Non-Union', category: 'Capability', color: '#78716c', description: 'Non-union workforce' },

  // Certification
  { name: 'Licensed', category: 'Certification', color: '#22c55e', description: 'State licensed contractor' },
  { name: 'Bonded', category: 'Certification', color: '#14b8a6', description: 'Bonded contractor' },
  { name: 'Insured', category: 'Certification', color: '#3b82f6', description: 'Fully insured' },
  { name: 'LEED Certified', category: 'Certification', color: '#84cc16', description: 'LEED certified contractor' },
  { name: 'MBE', category: 'Certification', color: '#a855f7', description: 'Minority Business Enterprise' },
  { name: 'WBE', category: 'Certification', color: '#ec4899', description: 'Women Business Enterprise' },
  { name: 'DBE', category: 'Certification', color: '#f59e0b', description: 'Disadvantaged Business Enterprise' },
  { name: 'Veteran Owned', category: 'Certification', color: '#0d9488', description: 'Veteran-owned business' },
]

async function main() {
  console.log('🏷️  Seeding vendor service tags...')

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
    const existingTags = await prisma.vendorServiceTag.findMany({
      where: { companyId: company.id },
      select: { name: true }
    })

    const existingNames = new Set(existingTags.map(t => t.name))
    console.log(`   Found ${existingTags.length} existing tags`)

    // Add missing tags
    let added = 0
    for (const tag of DEFAULT_TAGS) {
      if (!existingNames.has(tag.name)) {
        await prisma.vendorServiceTag.create({
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

  console.log('\n🎉 Vendor service tags seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding vendor service tags:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

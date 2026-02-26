import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Default vendor categories based on CSI MasterFormat divisions
const DEFAULT_CATEGORIES = [
  { name: 'General Contractor', csiDivision: '01', color: '#6366f1', description: 'General construction and project management' },
  { name: 'Site Work', csiDivision: '02', color: '#8b5cf6', description: 'Earthwork, demolition, and site preparation' },
  { name: 'Concrete', csiDivision: '03', color: '#64748b', description: 'Concrete work and foundations' },
  { name: 'Masonry', csiDivision: '04', color: '#f97316', description: 'Brick, block, and stone work' },
  { name: 'Metals', csiDivision: '05', color: '#78716c', description: 'Structural and miscellaneous metals' },
  { name: 'Wood & Plastics', csiDivision: '06', color: '#a16207', description: 'Carpentry and millwork' },
  { name: 'Thermal & Moisture', csiDivision: '07', color: '#0891b2', description: 'Insulation, roofing, and waterproofing' },
  { name: 'Doors & Windows', csiDivision: '08', color: '#0d9488', description: 'Doors, windows, and glazing' },
  { name: 'Finishes', csiDivision: '09', color: '#ec4899', description: 'Drywall, flooring, painting, and ceiling' },
  { name: 'Specialties', csiDivision: '10', color: '#f43f5e', description: 'Signage, lockers, and specialty items' },
  { name: 'Equipment', csiDivision: '11', color: '#84cc16', description: 'Commercial and industrial equipment' },
  { name: 'Furnishings', csiDivision: '12', color: '#a855f7', description: 'Furniture, fixtures, and casework' },
  { name: 'Special Construction', csiDivision: '13', color: '#3b82f6', description: 'Clean rooms, pools, and special structures' },
  { name: 'Conveying Systems', csiDivision: '14', color: '#6b7280', description: 'Elevators, escalators, and lifts' },
  { name: 'Mechanical', csiDivision: '15', color: '#22c55e', description: 'HVAC, plumbing, and fire protection' },
  { name: 'Electrical', csiDivision: '16', color: '#eab308', description: 'Electrical systems and lighting' },
  // Additional common trades
  { name: 'Plumbing', csiDivision: '22', color: '#0ea5e9', description: 'Plumbing systems and fixtures' },
  { name: 'HVAC', csiDivision: '23', color: '#14b8a6', description: 'Heating, ventilation, and air conditioning' },
  { name: 'Fire Protection', csiDivision: '21', color: '#ef4444', description: 'Fire suppression and alarm systems' },
  { name: 'Communications', csiDivision: '27', color: '#8b5cf6', description: 'Data, telecom, and AV systems' },
  { name: 'Electronic Safety', csiDivision: '28', color: '#f59e0b', description: 'Security, access control, and CCTV' },
  { name: 'Landscaping', csiDivision: '32', color: '#22c55e', description: 'Exterior landscaping and irrigation' },
]

async function main() {
  console.log('🌱 Seeding vendor categories...')

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

    // Check existing categories
    const existingCategories = await prisma.vendorCategory.findMany({
      where: { companyId: company.id },
      select: { name: true }
    })

    const existingNames = new Set(existingCategories.map(c => c.name))
    console.log(`   Found ${existingCategories.length} existing categories`)

    // Add missing categories
    let added = 0
    for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      const cat = DEFAULT_CATEGORIES[i]
      if (!existingNames.has(cat.name)) {
        await prisma.vendorCategory.create({
          data: {
            name: cat.name,
            description: cat.description,
            color: cat.color,
            csiDivision: cat.csiDivision,
            sortOrder: i,
            companyId: company.id
          }
        })
        added++
      }
    }

    console.log(`   ✅ Added ${added} new categories`)
  }

  console.log('\n🎉 Vendor categories seeding complete!')
}

main()
  .catch((e) => {
    console.error('Error seeding vendor categories:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

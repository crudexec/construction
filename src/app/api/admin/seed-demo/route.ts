import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import {
  Role,
  Priority,
  TaskStatus,
  CardStatus,
  EstimateStatus,
  BidStatus,
  WalkaroundStatus,
  VendorType,
  VendorStatus,
  MilestoneStatus,
  ProjectVendorStatus,
  ContractType,
  ContractStatus,
  AssetType,
  AssetStatus,
  PurchaseOrderStatus,
  InventoryTransactionType
} from '@prisma/client'

async function seedDemoDatabase(companyName: string = 'Allied Construction', userEmail: string = 'bdeller@alliedconstruction.net') {
  // Check if company already exists
  let company = await prisma.company.findFirst({
    where: { name: companyName }
  })

  // Check if user already exists
  let existingUser = await prisma.user.findUnique({
    where: { email: userEmail }
  })

  if (existingUser) {
    // Get or create company for existing user
    company = await prisma.company.findUnique({
      where: { id: existingUser.companyId }
    })
  }

  if (!company) {
    // Create Company
    company = await prisma.company.create({
      data: {
        name: companyName,
        appName: 'BuildFlo',
        website: 'https://alliedconstruction.net',
        phone: '(555) 789-0123',
        email: 'info@alliedconstruction.net',
        address: '500 Construction Way',
        city: 'Phoenix',
        state: 'AZ',
        zipCode: '85001',
        country: 'USA',
        currency: 'USD'
      }
    })
  }

  // Clean up existing data for this company to allow re-seeding
  // Order matters due to foreign key constraints
  await prisma.$transaction([
    // Delete inventory and procurement related
    prisma.inventoryTransaction.deleteMany({ where: { material: { companyId: company.id } } }),
    prisma.inventoryMaterial.deleteMany({ where: { companyId: company.id } }),
    prisma.inventoryCategory.deleteMany({ where: { companyId: company.id } }),
    prisma.inventoryUsage.deleteMany({ where: { inventory: { project: { companyId: company.id } } } }),
    prisma.inventoryPurchase.deleteMany({ where: { inventory: { project: { companyId: company.id } } } }),
    prisma.inventoryEntry.deleteMany({ where: { project: { companyId: company.id } } }),
    prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { companyId: company.id } } }),
    prisma.bOQPurchaseOrder.deleteMany({ where: { purchaseOrder: { companyId: company.id } } }),
    prisma.purchaseOrder.deleteMany({ where: { companyId: company.id } }),
    prisma.priceComparison.deleteMany({ where: { item: { companyId: company.id } } }),
    prisma.procurementItem.deleteMany({ where: { companyId: company.id } }),
    prisma.stockAlertConfig.deleteMany({ where: { companyId: company.id } }),

    // Delete BOQ
    prisma.bOQRevision.deleteMany({ where: { project: { companyId: company.id } } }),
    prisma.bOQItem.deleteMany({ where: { project: { companyId: company.id } } }),

    // Delete assets
    prisma.maintenanceRecord.deleteMany({ where: { asset: { companyId: company.id } } }),
    prisma.maintenanceSchedule.deleteMany({ where: { asset: { companyId: company.id } } }),
    prisma.assetRequest.deleteMany({ where: { asset: { companyId: company.id } } }),
    prisma.asset.deleteMany({ where: { companyId: company.id } }),

    // Delete vendor related
    prisma.contractPayment.deleteMany({ where: { contract: { vendor: { companyId: company.id } } } }),
    prisma.contractDocument.deleteMany({ where: { contract: { vendor: { companyId: company.id } } } }),
    prisma.projectContract.deleteMany({ where: { contract: { vendor: { companyId: company.id } } } }),
    prisma.vendorContract.deleteMany({ where: { vendor: { companyId: company.id } } }),
    prisma.vendorReview.deleteMany({ where: { vendor: { companyId: company.id } } }),
    prisma.vendorCommentMention.deleteMany({ where: { comment: { vendor: { companyId: company.id } } } }),
    prisma.vendorComment.deleteMany({ where: { vendor: { companyId: company.id } } }),
    prisma.vendorMilestone.deleteMany({ where: { vendor: { companyId: company.id } } }),
    prisma.vendorContact.deleteMany({ where: { vendor: { companyId: company.id } } }),
    prisma.projectVendor.deleteMany({ where: { vendor: { companyId: company.id } } }),

    // Delete project milestones (before tasks that reference them)
    prisma.projectMilestone.deleteMany({ where: { project: { companyId: company.id } } }),

    // Delete project related
    prisma.walkaroundPhoto.deleteMany({ where: { walkaround: { project: { companyId: company.id } } } }),
    prisma.walkaround.deleteMany({ where: { project: { companyId: company.id } } }),
    prisma.clientPortalSettings.deleteMany({ where: { project: { companyId: company.id } } }),
    prisma.bidView.deleteMany({ where: { bidRequest: { companyId: company.id } } }),
    prisma.bidItem.deleteMany({ where: { bid: { bidRequest: { companyId: company.id } } } }),
    prisma.bid.deleteMany({ where: { bidRequest: { companyId: company.id } } }),
    prisma.bidDocument.deleteMany({ where: { bidRequest: { companyId: company.id } } }),
    prisma.bidRequest.deleteMany({ where: { companyId: company.id } }),
    prisma.taskPayment.deleteMany({ where: { task: { card: { companyId: company.id } } } }),
    prisma.taskAttachment.deleteMany({ where: { task: { card: { companyId: company.id } } } }),
    prisma.taskCommentMention.deleteMany({ where: { comment: { task: { card: { companyId: company.id } } } } }),
    prisma.taskComment.deleteMany({ where: { task: { card: { companyId: company.id } } } }),
    prisma.taskInteraction.deleteMany({ where: { task: { card: { companyId: company.id } } } }),
    prisma.task.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.taskCategory.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.estimateLineItem.deleteMany({ where: { estimate: { card: { companyId: company.id } } } }),
    prisma.estimate.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.budgetItem.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.document.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.folder.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.activity.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.message.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.feedback.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.dailyLog.deleteMany({ where: { card: { companyId: company.id } } }),
    prisma.card.deleteMany({ where: { companyId: company.id } }),

    // Delete vendors (after all vendor references are removed)
    prisma.vendor.deleteMany({ where: { companyId: company.id } }),

    // Delete stages
    prisma.stage.deleteMany({ where: { companyId: company.id } }),

    // Delete templates
    prisma.projectTemplateTask.deleteMany({ where: { category: { template: { companyId: company.id } } } }),
    prisma.projectTemplateCategory.deleteMany({ where: { template: { companyId: company.id } } }),
    prisma.projectTemplateFolder.deleteMany({ where: { template: { companyId: company.id } } }),
    prisma.projectTemplateBudget.deleteMany({ where: { template: { companyId: company.id } } }),
    prisma.projectTemplate.deleteMany({ where: { companyId: company.id } }),

    // Delete notifications and preferences (keep users)
    prisma.notification.deleteMany({ where: { user: { companyId: company.id } } }),

    // Delete team invites
    prisma.teamInvite.deleteMany({ where: { companyId: company.id } }),

    // Delete estimate items (company level)
    prisma.estimateItem.deleteMany({ where: { companyId: company.id } })
  ])

  // Create Users
  const hashedPassword = await hash('Demo123!', 10)

  // Create or get admin user
  let adminUser = existingUser
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        firstName: 'Brandon',
        lastName: 'Deller',
        phone: '(555) 789-0124',
        role: Role.ADMIN,
        companyId: company.id,
        lastLogin: new Date()
      }
    })
  }

  // Create additional team members
  const staffUser1 = await prisma.user.upsert({
    where: { email: 'marcus.chen@alliedconstruction.net' },
    update: {},
    create: {
      email: 'marcus.chen@alliedconstruction.net',
      password: hashedPassword,
      firstName: 'Marcus',
      lastName: 'Chen',
      phone: '(555) 789-0125',
      role: Role.STAFF,
      companyId: company.id,
      lastLogin: new Date(Date.now() - 3600000)
    }
  })

  const staffUser2 = await prisma.user.upsert({
    where: { email: 'lisa.rodriguez@alliedconstruction.net' },
    update: {},
    create: {
      email: 'lisa.rodriguez@alliedconstruction.net',
      password: hashedPassword,
      firstName: 'Lisa',
      lastName: 'Rodriguez',
      phone: '(555) 789-0126',
      role: Role.STAFF,
      companyId: company.id
    }
  })

  const staffUser3 = await prisma.user.upsert({
    where: { email: 'james.wilson@alliedconstruction.net' },
    update: {},
    create: {
      email: 'james.wilson@alliedconstruction.net',
      password: hashedPassword,
      firstName: 'James',
      lastName: 'Wilson',
      phone: '(555) 789-0127',
      role: Role.STAFF,
      companyId: company.id
    }
  })

  const subcontractor = await prisma.user.upsert({
    where: { email: 'tony.martinez@martinezelectric.com' },
    update: {},
    create: {
      email: 'tony.martinez@martinezelectric.com',
      password: hashedPassword,
      firstName: 'Tony',
      lastName: 'Martinez',
      phone: '(555) 456-7890',
      role: Role.SUBCONTRACTOR,
      companyId: company.id
    }
  })

  // Create Pipeline Stages - stages were already deleted in cleanup above
  const stages = await Promise.all([
    prisma.stage.create({
      data: { name: 'Lead', color: '#94a3b8', order: 0, companyId: company.id }
    }),
    prisma.stage.create({
      data: { name: 'Qualification', color: '#fbbf24', order: 1, companyId: company.id }
    }),
    prisma.stage.create({
      data: { name: 'Proposal', color: '#fb923c', order: 2, companyId: company.id }
    }),
    prisma.stage.create({
      data: { name: 'Negotiation', color: '#a78bfa', order: 3, companyId: company.id }
    }),
    prisma.stage.create({
      data: { name: 'Contract', color: '#60a5fa', order: 4, companyId: company.id }
    }),
    prisma.stage.create({
      data: { name: 'In Progress', color: '#34d399', order: 5, companyId: company.id }
    }),
    prisma.stage.create({
      data: { name: 'Completed', color: '#10b981', order: 6, companyId: company.id }
    })
  ])

  const inProgressStage = stages[5]
  const negotiationStage = stages[3]
  const proposalStage = stages[2]
  const completedStage = stages[6]

  // ==========================================
  // CREATE VENDORS
  // ==========================================

  const vendor1 = await prisma.vendor.create({
    data: {
      name: 'Martinez Electrical Services',
      companyName: 'Martinez Electric LLC',
      email: 'info@martinezelectric.com',
      phone: '(555) 456-7890',
      address: '123 Electric Ave',
      city: 'Phoenix',
      state: 'AZ',
      zipCode: '85002',
      website: 'https://martinezelectric.com',
      licenseNumber: 'AZ-ELEC-12345',
      insuranceInfo: 'Liability: $2M, Workers Comp: Yes',
      type: VendorType.SUPPLY_AND_INSTALLATION,
      status: VendorStatus.VERIFIED,
      scopeOfWork: 'Commercial and residential electrical installations, panel upgrades, lighting design',
      paymentTerms: 'Net 30',
      isActive: true,
      companyId: company.id
    }
  })

  const vendor2 = await prisma.vendor.create({
    data: {
      name: 'Southwest Plumbing Solutions',
      companyName: 'SW Plumbing Inc',
      email: 'contact@swplumbing.com',
      phone: '(555) 567-8901',
      address: '456 Water Works Blvd',
      city: 'Scottsdale',
      state: 'AZ',
      zipCode: '85251',
      website: 'https://swplumbing.com',
      licenseNumber: 'AZ-PLUMB-67890',
      insuranceInfo: 'Liability: $1.5M, Workers Comp: Yes',
      type: VendorType.INSTALLATION,
      status: VendorStatus.VERIFIED,
      scopeOfWork: 'Full plumbing services including new construction, remodeling, and repairs',
      paymentTerms: 'Net 15',
      isActive: true,
      companyId: company.id
    }
  })

  const vendor3 = await prisma.vendor.create({
    data: {
      name: 'Desert Stone & Tile',
      companyName: 'Desert Stone Materials LLC',
      email: 'sales@desertstone.com',
      phone: '(555) 678-9012',
      address: '789 Granite Road',
      city: 'Tempe',
      state: 'AZ',
      zipCode: '85281',
      website: 'https://desertstonetile.com',
      licenseNumber: 'AZ-CONT-11111',
      insuranceInfo: 'Liability: $1M',
      type: VendorType.SUPPLY,
      status: VendorStatus.VERIFIED,
      scopeOfWork: 'Natural stone, ceramic tile, porcelain tile supply and delivery',
      paymentTerms: 'Net 45',
      isActive: true,
      companyId: company.id
    }
  })

  const vendor4 = await prisma.vendor.create({
    data: {
      name: 'Arizona HVAC Systems',
      companyName: 'AZ HVAC Corp',
      email: 'service@azhvac.com',
      phone: '(555) 789-0123',
      address: '321 Cool Breeze Lane',
      city: 'Mesa',
      state: 'AZ',
      zipCode: '85201',
      licenseNumber: 'AZ-HVAC-22222',
      insuranceInfo: 'Liability: $2M, Workers Comp: Yes',
      type: VendorType.SUPPLY_AND_INSTALLATION,
      status: VendorStatus.VERIFIED,
      scopeOfWork: 'HVAC installation, maintenance, and repair for commercial and residential',
      paymentTerms: 'Net 30',
      isActive: true,
      companyId: company.id
    }
  })

  const vendor5 = await prisma.vendor.create({
    data: {
      name: 'Premium Paint & Finishes',
      companyName: 'Premium Paint Co',
      email: 'orders@premiumpaint.com',
      phone: '(555) 890-1234',
      address: '555 Color Way',
      city: 'Glendale',
      state: 'AZ',
      zipCode: '85301',
      type: VendorType.SUPPLY,
      status: VendorStatus.PENDING_VERIFICATION,
      scopeOfWork: 'Interior and exterior paint, stains, sealers, and finishing products',
      paymentTerms: 'Net 30',
      isActive: true,
      companyId: company.id
    }
  })

  // Create Vendor Contacts
  await prisma.vendorContact.createMany({
    data: [
      { firstName: 'Tony', lastName: 'Martinez', email: 'tony@martinezelectric.com', phone: '(555) 456-7891', position: 'Owner', isPrimary: true, vendorId: vendor1.id },
      { firstName: 'Maria', lastName: 'Martinez', email: 'maria@martinezelectric.com', phone: '(555) 456-7892', position: 'Office Manager', isBilling: true, vendorId: vendor1.id },
      { firstName: 'Roberto', lastName: 'Sanchez', email: 'roberto@swplumbing.com', phone: '(555) 567-8902', position: 'Project Manager', isPrimary: true, vendorId: vendor2.id },
      { firstName: 'David', lastName: 'Stone', email: 'david@desertstone.com', phone: '(555) 678-9013', position: 'Sales Rep', isPrimary: true, vendorId: vendor3.id },
      { firstName: 'Mike', lastName: 'Cool', email: 'mike@azhvac.com', phone: '(555) 789-0124', position: 'Service Manager', isPrimary: true, vendorId: vendor4.id }
    ]
  })

  // Create Vendor Comments
  await prisma.vendorComment.createMany({
    data: [
      { content: 'Great experience with Martinez Electric on the downtown project. They finished 2 days ahead of schedule.', vendorId: vendor1.id, authorId: adminUser.id },
      { content: 'Need to follow up on their updated insurance certificate - expires next month.', vendorId: vendor1.id, authorId: staffUser1.id },
      { content: 'Excellent quality work on the bathroom renovations. Highly recommend for plumbing.', vendorId: vendor2.id, authorId: staffUser2.id },
      { content: 'Their delivery times have been consistent. Good material quality.', vendorId: vendor3.id, authorId: adminUser.id },
      { content: 'Initial meeting went well. Still waiting on their proposal for the HVAC upgrade.', vendorId: vendor4.id, authorId: staffUser3.id }
    ]
  })

  // Create Vendor Reviews
  await prisma.vendorReview.createMany({
    data: [
      { overallRating: 4.5, qualityRating: 5, timelinessRating: 4, communicationRating: 5, professionalismRating: 4, comments: 'Outstanding electrical work on multiple projects. Very professional team.', vendorId: vendor1.id, reviewerId: adminUser.id },
      { overallRating: 4, qualityRating: 4, timelinessRating: 4, communicationRating: 4, professionalismRating: 4, comments: 'Reliable plumbing contractor. Good communication throughout the project.', vendorId: vendor2.id, reviewerId: staffUser1.id },
      { overallRating: 4.5, qualityRating: 5, timelinessRating: 4, communicationRating: 4, professionalismRating: 5, comments: 'High quality stone materials. Delivery was on time.', vendorId: vendor3.id, reviewerId: staffUser2.id }
    ]
  })

  // ==========================================
  // CREATE PROJECTS
  // ==========================================

  const project1 = await prisma.card.create({
    data: {
      title: 'Downtown Phoenix Office Complex',
      description: 'Complete renovation of a 50,000 sq ft office building including new electrical, HVAC, and interior finishes',
      contactName: 'Robert Anderson',
      contactEmail: 'randerson@phoenixproperties.com',
      contactPhone: '(555) 111-2222',
      projectAddress: '100 N Central Ave',
      projectCity: 'Phoenix',
      projectState: 'AZ',
      projectZipCode: '85004',
      projectSize: 50000,
      projectSizeUnit: 'sq ft',
      budget: 2500000,
      timeline: '24 weeks',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-07-15'),
      priority: Priority.HIGH,
      status: CardStatus.ACTIVE,
      stageId: inProgressStage.id,
      companyId: company.id,
      ownerId: adminUser.id,
      assignedUsers: {
        connect: [{ id: staffUser1.id }, { id: staffUser2.id }]
      }
    }
  })

  const project2 = await prisma.card.create({
    data: {
      title: 'Scottsdale Luxury Home Build',
      description: 'New construction of a 6,500 sq ft luxury residence with pool and outdoor living spaces',
      contactName: 'Jennifer Mitchell',
      contactEmail: 'jmitchell@email.com',
      contactPhone: '(555) 333-4444',
      projectAddress: '8500 E Pinnacle Peak Rd',
      projectCity: 'Scottsdale',
      projectState: 'AZ',
      projectZipCode: '85255',
      projectSize: 6500,
      projectSizeUnit: 'sq ft',
      budget: 1800000,
      timeline: '18 months',
      startDate: new Date('2024-02-01'),
      priority: Priority.MEDIUM,
      status: CardStatus.ACTIVE,
      stageId: negotiationStage.id,
      companyId: company.id,
      ownerId: staffUser1.id,
      assignedUsers: {
        connect: [{ id: staffUser3.id }]
      }
    }
  })

  const project3 = await prisma.card.create({
    data: {
      title: 'Mesa Restaurant Renovation',
      description: 'Full interior renovation of a 4,000 sq ft restaurant including new kitchen equipment and dining area',
      contactName: 'Carlos Vega',
      contactEmail: 'cvega@vegasdining.com',
      contactPhone: '(555) 555-6666',
      projectAddress: '250 W Main St',
      projectCity: 'Mesa',
      projectState: 'AZ',
      projectZipCode: '85201',
      projectSize: 4000,
      projectSizeUnit: 'sq ft',
      budget: 450000,
      timeline: '10 weeks',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-05-15'),
      priority: Priority.URGENT,
      status: CardStatus.ACTIVE,
      stageId: proposalStage.id,
      companyId: company.id,
      ownerId: staffUser2.id
    }
  })

  const project4 = await prisma.card.create({
    data: {
      title: 'Tempe Medical Clinic',
      description: 'Build-out of a new medical clinic space with specialized electrical and HVAC requirements',
      contactName: 'Dr. Sarah Thompson',
      contactEmail: 'sthompson@tempemedical.com',
      contactPhone: '(555) 777-8888',
      projectAddress: '1500 E University Dr',
      projectCity: 'Tempe',
      projectState: 'AZ',
      projectZipCode: '85281',
      projectSize: 8000,
      projectSizeUnit: 'sq ft',
      budget: 750000,
      timeline: '16 weeks',
      startDate: new Date('2023-09-01'),
      endDate: new Date('2023-12-20'),
      priority: Priority.HIGH,
      status: CardStatus.COMPLETED,
      stageId: completedStage.id,
      companyId: company.id,
      ownerId: adminUser.id
    }
  })

  // ==========================================
  // CREATE PROJECT VENDORS (Vendor Assignments)
  // ==========================================

  const projectVendor1 = await prisma.projectVendor.create({
    data: {
      projectId: project1.id,
      vendorId: vendor1.id,
      assignedScope: 'Complete electrical installation including panel upgrades and lighting',
      contractValue: 185000,
      status: ProjectVendorStatus.IN_PROGRESS
    }
  })

  const projectVendor2 = await prisma.projectVendor.create({
    data: {
      projectId: project1.id,
      vendorId: vendor4.id,
      assignedScope: 'HVAC system replacement - 3 rooftop units',
      contractValue: 320000,
      status: ProjectVendorStatus.IN_PROGRESS
    }
  })

  await prisma.projectVendor.create({
    data: {
      projectId: project2.id,
      vendorId: vendor2.id,
      assignedScope: 'Full plumbing for new construction including pool equipment',
      contractValue: 95000,
      status: ProjectVendorStatus.ASSIGNED
    }
  })

  await prisma.projectVendor.create({
    data: {
      projectId: project2.id,
      vendorId: vendor3.id,
      assignedScope: 'Natural stone supply for all bathrooms and kitchen',
      contractValue: 45000,
      status: ProjectVendorStatus.ASSIGNED
    }
  })

  // ==========================================
  // CREATE PROJECT MILESTONES
  // ==========================================

  const milestone1 = await prisma.projectMilestone.create({
    data: {
      title: 'Electrical Rough-In Complete',
      description: 'All electrical wiring and conduit installed, ready for inspection',
      amount: 55000,
      targetDate: new Date('2024-03-15'),
      status: MilestoneStatus.COMPLETED,
      completedDate: new Date('2024-03-12'),
      order: 1,
      projectId: project1.id,
      vendorId: vendor1.id,
      createdById: adminUser.id
    }
  })

  const milestone2 = await prisma.projectMilestone.create({
    data: {
      title: 'Panel Installation',
      description: 'Main electrical panels installed and energized',
      amount: 75000,
      targetDate: new Date('2024-04-30'),
      status: MilestoneStatus.IN_PROGRESS,
      order: 2,
      projectId: project1.id,
      vendorId: vendor1.id,
      createdById: adminUser.id
    }
  })

  const milestone3 = await prisma.projectMilestone.create({
    data: {
      title: 'HVAC Equipment Delivery',
      description: 'All rooftop units delivered and staged',
      amount: 180000,
      targetDate: new Date('2024-04-15'),
      status: MilestoneStatus.COMPLETED,
      completedDate: new Date('2024-04-14'),
      order: 1,
      projectId: project1.id,
      vendorId: vendor4.id,
      createdById: adminUser.id
    }
  })

  const milestone4 = await prisma.projectMilestone.create({
    data: {
      title: 'HVAC Installation & Commissioning',
      description: 'All HVAC units installed, tested, and commissioned',
      amount: 140000,
      targetDate: new Date('2024-05-30'),
      status: MilestoneStatus.PENDING,
      order: 2,
      projectId: project1.id,
      vendorId: vendor4.id,
      createdById: adminUser.id
    }
  })

  const milestone5 = await prisma.projectMilestone.create({
    data: {
      title: 'Foundation Complete',
      description: 'All foundation work completed and inspected',
      amount: 120000,
      targetDate: new Date('2024-04-01'),
      status: MilestoneStatus.PENDING,
      order: 1,
      projectId: project2.id,
      createdById: staffUser1.id
    }
  })

  // ==========================================
  // CREATE TASK CATEGORIES
  // ==========================================

  const demolitionCategory = await prisma.taskCategory.create({
    data: { name: 'Demolition', description: 'Removal and site prep work', color: '#ef4444', order: 1, cardId: project1.id }
  })

  const electricalCategory = await prisma.taskCategory.create({
    data: { name: 'Electrical', description: 'All electrical work', color: '#f59e0b', order: 2, cardId: project1.id }
  })

  const hvacCategory = await prisma.taskCategory.create({
    data: { name: 'HVAC', description: 'Heating, ventilation, and air conditioning', color: '#3b82f6', order: 3, cardId: project1.id }
  })

  const finishesCategory = await prisma.taskCategory.create({
    data: { name: 'Finishes', description: 'Interior finishes and paint', color: '#8b5cf6', order: 4, cardId: project1.id }
  })

  // Project 2 categories
  await prisma.taskCategory.createMany({
    data: [
      { name: 'Site Work', description: 'Excavation and site preparation', color: '#78716c', order: 1, cardId: project2.id },
      { name: 'Foundation', description: 'Foundation and concrete work', color: '#64748b', order: 2, cardId: project2.id },
      { name: 'Framing', description: 'Structural framing', color: '#84cc16', order: 3, cardId: project2.id },
      { name: 'Plumbing', description: 'All plumbing work', color: '#06b6d4', order: 4, cardId: project2.id }
    ]
  })

  // ==========================================
  // CREATE TASKS
  // ==========================================

  // Tasks for Project 1
  await prisma.task.create({
    data: {
      title: 'Complete demolition of existing electrical',
      description: 'Remove all outdated wiring and fixtures from floors 1-3',
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      cardId: project1.id,
      categoryId: demolitionCategory.id,
      assigneeId: staffUser2.id,
      creatorId: adminUser.id,
      completedAt: new Date('2024-02-01'),
      milestoneId: milestone1.id,
      vendorId: vendor1.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Install main electrical conduit runs',
      description: 'Run all primary conduit from electrical room to each floor',
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      dueDate: new Date('2024-03-01'),
      cardId: project1.id,
      categoryId: electricalCategory.id,
      assigneeId: subcontractor.id,
      creatorId: adminUser.id,
      completedAt: new Date('2024-02-28'),
      milestoneId: milestone1.id,
      vendorId: vendor1.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Install electrical panels - Floor 1',
      description: 'Install and wire main distribution panel on floor 1',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: new Date('2024-04-15'),
      cardId: project1.id,
      categoryId: electricalCategory.id,
      assigneeId: subcontractor.id,
      creatorId: adminUser.id,
      milestoneId: milestone2.id,
      vendorId: vendor1.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Install electrical panels - Floors 2-3',
      description: 'Install and wire distribution panels on floors 2 and 3',
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: new Date('2024-04-30'),
      cardId: project1.id,
      categoryId: electricalCategory.id,
      creatorId: adminUser.id,
      milestoneId: milestone2.id,
      vendorId: vendor1.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Remove existing HVAC units',
      description: 'Disconnect and remove 2 existing rooftop units',
      status: TaskStatus.COMPLETED,
      priority: Priority.MEDIUM,
      cardId: project1.id,
      categoryId: hvacCategory.id,
      assigneeId: staffUser1.id,
      creatorId: adminUser.id,
      completedAt: new Date('2024-04-01'),
      vendorId: vendor4.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Install new RTU-1 (10 ton)',
      description: 'Set and connect first rooftop unit for zones 1-3',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: new Date('2024-05-01'),
      cardId: project1.id,
      categoryId: hvacCategory.id,
      assigneeId: staffUser1.id,
      creatorId: adminUser.id,
      milestoneId: milestone4.id,
      vendorId: vendor4.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Repair drywall in lobby area',
      description: 'Patch and repair all damaged drywall sections in main lobby',
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: new Date('2024-06-01'),
      cardId: project1.id,
      categoryId: finishesCategory.id,
      creatorId: adminUser.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Paint all common areas',
      description: 'Prime and apply 2 coats of paint to all hallways and common spaces',
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: new Date('2024-06-15'),
      cardId: project1.id,
      categoryId: finishesCategory.id,
      creatorId: adminUser.id
    }
  })

  // ==========================================
  // CREATE VENDOR CONTRACTS
  // ==========================================

  const contract1 = await prisma.vendorContract.create({
    data: {
      contractNumber: 'CTR-2024-001',
      vendorId: vendor1.id,
      type: ContractType.LUMP_SUM,
      totalSum: 185000,
      retentionPercent: 10,
      retentionAmount: 18500,
      warrantyYears: 2,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-07-15'),
      status: ContractStatus.ACTIVE,
      terms: 'Standard lump sum contract. Payment upon completion of each milestone. 10% retention to be released 30 days after project completion.',
      notes: 'Includes all labor, materials, and equipment for electrical scope.'
    }
  })

  const contract2 = await prisma.vendorContract.create({
    data: {
      contractNumber: 'CTR-2024-002',
      vendorId: vendor4.id,
      type: ContractType.LUMP_SUM,
      totalSum: 320000,
      retentionPercent: 10,
      retentionAmount: 32000,
      warrantyYears: 5,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-07-15'),
      status: ContractStatus.ACTIVE,
      terms: 'HVAC installation and commissioning. Equipment warranty 5 years. Labor warranty 1 year.',
      notes: 'Carrier equipment specified. Must provide startup documentation.'
    }
  })

  // Link contracts to projects
  await prisma.projectContract.createMany({
    data: [
      { contractId: contract1.id, projectId: project1.id, allocatedAmount: 185000 },
      { contractId: contract2.id, projectId: project1.id, allocatedAmount: 320000 }
    ]
  })

  // Create contract payments
  await prisma.contractPayment.createMany({
    data: [
      { contractId: contract1.id, amount: 55000, paymentDate: new Date('2024-03-15'), reference: 'CHK-10234', notes: 'Payment for Milestone 1 - Rough-in complete', createdById: adminUser.id },
      { contractId: contract2.id, amount: 180000, paymentDate: new Date('2024-04-15'), reference: 'CHK-10256', notes: 'Payment for equipment delivery', createdById: adminUser.id }
    ]
  })

  // ==========================================
  // CREATE ASSETS
  // ==========================================

  const excavator = await prisma.asset.create({
    data: {
      name: 'CAT 320 Excavator',
      description: '2021 Caterpillar 320 Hydraulic Excavator',
      type: AssetType.EQUIPMENT,
      serialNumber: 'CAT320-2021-78901',
      status: AssetStatus.IN_USE,
      currentLocation: 'Downtown Phoenix Office Complex',
      currentAssigneeId: staffUser2.id,
      purchaseCost: 185000,
      purchaseDate: new Date('2021-06-15'),
      warrantyExpiry: new Date('2026-06-15'),
      companyId: company.id
    }
  })

  const workTruck1 = await prisma.asset.create({
    data: {
      name: 'Ford F-250 Work Truck #1',
      description: '2022 Ford F-250 Super Duty with tool bed',
      type: AssetType.VEHICLE,
      serialNumber: 'VIN-F250-2022-12345',
      status: AssetStatus.AVAILABLE,
      currentLocation: 'Main Yard',
      purchaseCost: 65000,
      purchaseDate: new Date('2022-03-01'),
      warrantyExpiry: new Date('2025-03-01'),
      companyId: company.id
    }
  })

  const workTruck2 = await prisma.asset.create({
    data: {
      name: 'Ford F-250 Work Truck #2',
      description: '2023 Ford F-250 Super Duty with service body',
      type: AssetType.VEHICLE,
      serialNumber: 'VIN-F250-2023-67890',
      status: AssetStatus.IN_USE,
      currentLocation: 'Scottsdale Site',
      currentAssigneeId: staffUser3.id,
      purchaseCost: 72000,
      purchaseDate: new Date('2023-01-15'),
      warrantyExpiry: new Date('2026-01-15'),
      companyId: company.id
    }
  })

  const generator = await prisma.asset.create({
    data: {
      name: 'Honda EU7000is Generator',
      description: 'Portable inverter generator 7000W',
      type: AssetType.EQUIPMENT,
      serialNumber: 'HONDA-GEN-2023-11111',
      status: AssetStatus.AVAILABLE,
      currentLocation: 'Tool Room',
      purchaseCost: 4500,
      purchaseDate: new Date('2023-04-01'),
      companyId: company.id
    }
  })

  const laserLevel = await prisma.asset.create({
    data: {
      name: 'Bosch Laser Level Kit',
      description: 'Self-leveling rotary laser with tripod',
      type: AssetType.TOOL,
      serialNumber: 'BOSCH-LASER-2022-22222',
      status: AssetStatus.IN_USE,
      currentLocation: 'Mesa Restaurant Site',
      currentAssigneeId: staffUser1.id,
      purchaseCost: 850,
      purchaseDate: new Date('2022-08-15'),
      companyId: company.id
    }
  })

  // Create Maintenance Schedules
  await prisma.maintenanceSchedule.create({
    data: {
      assetId: excavator.id,
      title: 'Monthly Service - Excavator',
      description: 'Check hydraulic fluid, filters, tracks, and general inspection',
      type: 'RECURRING',
      intervalDays: 30,
      nextDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      lastCompletedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      estimatedCost: 450,
      assignedToId: staffUser2.id,
      isActive: true
    }
  })

  await prisma.maintenanceSchedule.create({
    data: {
      assetId: workTruck1.id,
      title: 'Oil Change - Truck #1',
      description: 'Regular oil change and fluid check',
      type: 'RECURRING',
      intervalDays: 90,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      estimatedCost: 120,
      isActive: true
    }
  })

  // ==========================================
  // CREATE PROCUREMENT ITEMS & INVENTORY
  // ==========================================

  const procItem1 = await prisma.procurementItem.create({
    data: {
      name: '12/2 Romex Wire',
      description: '12 gauge 2-conductor NM-B electrical wire',
      category: 'Electrical',
      unit: 'ft',
      defaultCost: 0.85,
      sku: 'ELEC-ROMEX-12-2',
      companyId: company.id,
      preferredVendorId: vendor1.id
    }
  })

  const procItem2 = await prisma.procurementItem.create({
    data: {
      name: '4" PVC Pipe',
      description: '4 inch Schedule 40 PVC pipe',
      category: 'Plumbing',
      unit: 'ft',
      defaultCost: 4.50,
      sku: 'PLMB-PVC-4IN',
      companyId: company.id,
      preferredVendorId: vendor2.id
    }
  })

  const procItem3 = await prisma.procurementItem.create({
    data: {
      name: 'Carrier RTU 10-Ton',
      description: 'Carrier 50XC 10-ton rooftop unit',
      category: 'HVAC',
      unit: 'each',
      defaultCost: 18500,
      sku: 'HVAC-RTU-10T',
      companyId: company.id,
      preferredVendorId: vendor4.id
    }
  })

  const procItem4 = await prisma.procurementItem.create({
    data: {
      name: 'Granite Countertop',
      description: 'Brazilian Black granite slab, polished finish',
      category: 'Finishes',
      unit: 'sq ft',
      defaultCost: 85,
      sku: 'FIN-GRANITE-BBP',
      companyId: company.id,
      preferredVendorId: vendor3.id
    }
  })

  // Create Inventory Entries for Project 1
  const inv1 = await prisma.inventoryEntry.create({
    data: {
      itemId: procItem1.id,
      projectId: project1.id,
      purchasedQty: 5000,
      usedQty: 3200,
      minStockLevel: 500
    }
  })

  // Inventory purchases
  await prisma.inventoryPurchase.create({
    data: {
      inventoryId: inv1.id,
      quantity: 5000,
      unitCost: 0.82,
      totalCost: 4100,
      supplierId: vendor1.id,
      invoiceNumber: 'ME-INV-2024-001',
      purchaseDate: new Date('2024-02-01'),
      recordedById: staffUser1.id
    }
  })

  // Inventory usage
  await prisma.inventoryUsage.createMany({
    data: [
      { inventoryId: inv1.id, quantity: 1500, usageDate: new Date('2024-02-15'), usedFor: 'Floor 1 rough-in', recordedById: staffUser1.id },
      { inventoryId: inv1.id, quantity: 1700, usageDate: new Date('2024-03-01'), usedFor: 'Floor 2 rough-in', recordedById: staffUser2.id }
    ]
  })

  // Price comparisons
  await prisma.priceComparison.createMany({
    data: [
      { itemId: procItem1.id, vendorId: vendor1.id, unitPrice: 0.82, minQuantity: 1000, isPreferred: true, leadTimeDays: 2 },
      { itemId: procItem3.id, vendorId: vendor4.id, unitPrice: 17800, isPreferred: true, leadTimeDays: 14 }
    ]
  })

  // ==========================================
  // CREATE PURCHASE ORDERS
  // ==========================================

  const po1 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-0001',
      vendorId: vendor1.id,
      projectId: project1.id,
      status: PurchaseOrderStatus.RECEIVED,
      subtotal: 4100,
      tax: 328,
      shipping: 0,
      total: 4428,
      expectedDeliveryDate: new Date('2024-02-01'),
      deliveredDate: new Date('2024-02-01'),
      notes: 'Initial electrical materials order',
      companyId: company.id,
      createdById: staffUser1.id,
      approvedById: adminUser.id,
      approvedAt: new Date('2024-01-28'),
      sentAt: new Date('2024-01-28')
    }
  })

  await prisma.purchaseOrderItem.create({
    data: {
      purchaseOrderId: po1.id,
      itemId: procItem1.id,
      quantity: 5000,
      unitPrice: 0.82,
      total: 4100,
      receivedQuantity: 5000
    }
  })

  const po2 = await prisma.purchaseOrder.create({
    data: {
      orderNumber: 'PO-2024-0002',
      vendorId: vendor4.id,
      projectId: project1.id,
      status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
      subtotal: 53400,
      tax: 4272,
      shipping: 500,
      total: 58172,
      expectedDeliveryDate: new Date('2024-04-15'),
      notes: 'HVAC equipment order - 3 RTUs',
      companyId: company.id,
      createdById: adminUser.id,
      approvedById: adminUser.id,
      approvedAt: new Date('2024-03-01'),
      sentAt: new Date('2024-03-01')
    }
  })

  await prisma.purchaseOrderItem.createMany({
    data: [
      { purchaseOrderId: po2.id, itemId: procItem3.id, quantity: 3, unitPrice: 17800, total: 53400, receivedQuantity: 2 }
    ]
  })

  // ==========================================
  // CREATE BOQ ITEMS
  // ==========================================

  await prisma.bOQItem.createMany({
    data: [
      { itemNumber: '1.1', name: 'Electrical Rough-In', description: 'Complete electrical rough-in for all floors', category: 'Electrical', unit: 'lump sum', quantity: 1, unitRate: 55000, totalCost: 55000, order: 1, projectId: project1.id, createdById: adminUser.id },
      { itemNumber: '1.2', name: 'Panel Installation', description: 'Main distribution panels installation', category: 'Electrical', unit: 'each', quantity: 3, unitRate: 12000, totalCost: 36000, order: 2, projectId: project1.id, createdById: adminUser.id },
      { itemNumber: '1.3', name: 'Lighting Fixtures', description: 'LED lighting fixtures supply and install', category: 'Electrical', unit: 'each', quantity: 150, unitRate: 450, totalCost: 67500, order: 3, projectId: project1.id, createdById: adminUser.id },
      { itemNumber: '2.1', name: 'HVAC Equipment', description: 'Rooftop units supply and installation', category: 'HVAC', unit: 'each', quantity: 3, unitRate: 85000, totalCost: 255000, order: 4, projectId: project1.id, createdById: adminUser.id },
      { itemNumber: '2.2', name: 'Ductwork', description: 'Supply and return ductwork installation', category: 'HVAC', unit: 'sq ft', quantity: 50000, unitRate: 1.25, totalCost: 62500, order: 5, projectId: project1.id, createdById: adminUser.id },
      { itemNumber: '3.1', name: 'Drywall', description: 'Drywall supply and installation', category: 'Finishes', unit: 'sq ft', quantity: 45000, unitRate: 3.50, totalCost: 157500, order: 6, projectId: project1.id, createdById: adminUser.id },
      { itemNumber: '3.2', name: 'Painting', description: 'Interior painting - walls and ceilings', category: 'Finishes', unit: 'sq ft', quantity: 90000, unitRate: 1.25, totalCost: 112500, order: 7, projectId: project1.id, createdById: adminUser.id },
      { itemNumber: '4.1', name: 'Contingency', description: 'Project contingency allowance', category: 'General', unit: 'lump sum', quantity: 1, unitRate: 125000, totalCost: 125000, isContingency: true, order: 8, projectId: project1.id, createdById: adminUser.id }
    ]
  })

  // ==========================================
  // CREATE INVENTORY (Materials)
  // ==========================================

  const invCategory1 = await prisma.inventoryCategory.create({
    data: { name: 'Electrical Supplies', description: 'Wiring, conduit, boxes, etc.', color: '#f59e0b', companyId: company.id }
  })

  const invCategory2 = await prisma.inventoryCategory.create({
    data: { name: 'Plumbing Supplies', description: 'Pipes, fittings, fixtures', color: '#06b6d4', companyId: company.id }
  })

  const invCategory3 = await prisma.inventoryCategory.create({
    data: { name: 'Hardware', description: 'Screws, bolts, fasteners', color: '#78716c', companyId: company.id }
  })

  const material1 = await prisma.inventoryMaterial.create({
    data: {
      name: '1/2" EMT Conduit - 10ft',
      sku: 'EMT-12-10',
      description: '1/2 inch EMT electrical conduit, 10ft sticks',
      categoryId: invCategory1.id,
      unit: 'each',
      quantity: 250,
      unitCost: 4.50,
      companyId: company.id
    }
  })

  const material2 = await prisma.inventoryMaterial.create({
    data: {
      name: '3/4" Copper Pipe - Type L',
      sku: 'COP-34-L',
      description: '3/4 inch copper pipe, Type L, 10ft length',
      categoryId: invCategory2.id,
      unit: 'each',
      quantity: 100,
      unitCost: 28.50,
      companyId: company.id
    }
  })

  const material3 = await prisma.inventoryMaterial.create({
    data: {
      name: 'Drywall Screws - 1-5/8"',
      sku: 'HW-DWS-158',
      description: 'Coarse thread drywall screws, 1-5/8 inch, 5lb box',
      categoryId: invCategory3.id,
      unit: 'box',
      quantity: 45,
      unitCost: 12.99,
      companyId: company.id
    }
  })

  // Create inventory transactions
  await prisma.inventoryTransaction.createMany({
    data: [
      { materialId: material1.id, type: InventoryTransactionType.STOCK_IN, quantity: 300, previousQty: 0, newQty: 300, reason: 'Initial stock from warehouse', userId: staffUser1.id },
      { materialId: material1.id, type: InventoryTransactionType.STOCK_OUT, quantity: 50, previousQty: 300, newQty: 250, reason: 'Used at Downtown Phoenix project', projectId: project1.id, userId: staffUser2.id },
      { materialId: material2.id, type: InventoryTransactionType.STOCK_IN, quantity: 100, previousQty: 0, newQty: 100, reason: 'Purchase from SW Plumbing', userId: staffUser1.id },
      { materialId: material3.id, type: InventoryTransactionType.STOCK_IN, quantity: 50, previousQty: 0, newQty: 50, reason: 'Hardware store purchase', userId: staffUser3.id },
      { materialId: material3.id, type: InventoryTransactionType.STOCK_OUT, quantity: 5, previousQty: 50, newQty: 45, reason: 'Drywall work at Mesa restaurant', projectId: project3.id, userId: staffUser2.id }
    ]
  })

  // ==========================================
  // CREATE FOLDERS & DOCUMENTS
  // ==========================================

  const contractsFolder = await prisma.folder.create({
    data: { name: 'Contracts', description: 'Legal contracts and agreements', color: '#dc2626', cardId: project1.id }
  })

  const drawingsFolder = await prisma.folder.create({
    data: { name: 'Drawings', description: 'Project drawings and plans', color: '#2563eb', cardId: project1.id }
  })

  const photosFolder = await prisma.folder.create({
    data: { name: 'Site Photos', description: 'Progress and documentation photos', color: '#16a34a', cardId: project1.id }
  })

  await prisma.document.createMany({
    data: [
      { name: 'Prime Contract', fileName: 'prime-contract.pdf', fileSize: 524288, mimeType: 'application/pdf', url: '/documents/prime-contract.pdf', folderId: contractsFolder.id, cardId: project1.id, uploaderId: adminUser.id },
      { name: 'Electrical Subcontract', fileName: 'electrical-subcontract.pdf', fileSize: 245678, mimeType: 'application/pdf', url: '/documents/electrical-subcontract.pdf', folderId: contractsFolder.id, cardId: project1.id, uploaderId: adminUser.id },
      { name: 'Floor Plan - Level 1', fileName: 'floor-plan-l1.pdf', fileSize: 1048576, mimeType: 'application/pdf', url: '/documents/floor-plan-l1.pdf', folderId: drawingsFolder.id, cardId: project1.id, uploaderId: staffUser1.id },
      { name: 'Electrical Drawings', fileName: 'electrical-drawings.pdf', fileSize: 2097152, mimeType: 'application/pdf', url: '/documents/electrical-drawings.pdf', folderId: drawingsFolder.id, cardId: project1.id, uploaderId: staffUser1.id }
    ]
  })

  // ==========================================
  // CREATE BUDGET ITEMS
  // ==========================================

  await prisma.budgetItem.createMany({
    data: [
      { name: 'Electrical Labor', description: 'Martinez Electric labor charges', category: 'Labor', amount: 85000, quantity: 1, isExpense: true, cardId: project1.id },
      { name: 'Electrical Materials', description: 'Wire, conduit, panels, fixtures', category: 'Materials', amount: 100000, quantity: 1, isExpense: true, cardId: project1.id },
      { name: 'HVAC Equipment', description: 'Rooftop units and accessories', category: 'Equipment', amount: 255000, quantity: 1, isExpense: true, cardId: project1.id },
      { name: 'HVAC Labor', description: 'Installation and commissioning', category: 'Labor', amount: 65000, quantity: 1, isExpense: true, cardId: project1.id },
      { name: 'Client Deposit', description: '30% project deposit received', category: 'Payment', amount: 750000, quantity: 1, isExpense: false, isPaid: true, paidAt: new Date('2024-01-10'), cardId: project1.id },
      { name: 'Progress Payment #1', description: 'First progress payment', category: 'Payment', amount: 500000, quantity: 1, isExpense: false, isPaid: true, paidAt: new Date('2024-03-15'), cardId: project1.id }
    ]
  })

  // ==========================================
  // CREATE ESTIMATES
  // ==========================================

  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber: 'EST-2024-0001',
      title: 'Downtown Phoenix Office Complex Renovation',
      description: 'Complete renovation including electrical, HVAC, and interior finishes for 50,000 sq ft office building',
      subtotal: 2350000,
      tax: 188000,
      discount: 38000,
      total: 2500000,
      status: EstimateStatus.ACCEPTED,
      validUntil: new Date('2024-02-01'),
      sentAt: new Date('2024-01-05'),
      viewedAt: new Date('2024-01-06'),
      acceptedAt: new Date('2024-01-10'),
      signedBy: 'Robert Anderson',
      notes: 'Price includes all labor, materials, equipment, and permits. Excludes tenant improvements.',
      terms: 'Payment terms: 30% deposit, 35% at 50% completion, 35% on substantial completion',
      cardId: project1.id
    }
  })

  await prisma.estimateLineItem.createMany({
    data: [
      { name: 'Electrical Work', description: 'Complete electrical renovation including service upgrade', quantity: 1, unit: 'lump sum', unitPrice: 185000, total: 185000, order: 1, estimateId: estimate.id },
      { name: 'HVAC Replacement', description: 'Replace 3 RTUs with new high-efficiency units', quantity: 3, unit: 'each', unitPrice: 106667, total: 320000, order: 2, estimateId: estimate.id },
      { name: 'Interior Finishes', description: 'Drywall, paint, flooring, and ceiling work', quantity: 50000, unit: 'sq ft', unitPrice: 25, total: 1250000, order: 3, estimateId: estimate.id },
      { name: 'Project Management', description: 'Supervision and project coordination', quantity: 24, unit: 'weeks', unitPrice: 12500, total: 300000, order: 4, estimateId: estimate.id },
      { name: 'Permits & Insurance', description: 'All required permits and insurance', quantity: 1, unit: 'allowance', unitPrice: 45000, total: 45000, order: 5, estimateId: estimate.id },
      { name: 'Contingency', description: '10% contingency for unforeseen conditions', quantity: 1, unit: 'allowance', unitPrice: 250000, total: 250000, order: 6, estimateId: estimate.id }
    ]
  })

  // ==========================================
  // CREATE MESSAGES
  // ==========================================

  await prisma.message.createMany({
    data: [
      { content: 'The electrical rough-in inspection passed! We can proceed with insulation.', isInternal: true, cardId: project1.id, senderId: staffUser1.id },
      { content: '@Lisa - can you schedule the HVAC crane lift for next week?', isInternal: true, cardId: project1.id, senderId: adminUser.id },
      { content: 'Great progress on the project! When do you expect to have the second floor electrical complete?', isFromClient: true, clientName: 'Robert Anderson', clientEmail: 'randerson@phoenixproperties.com', cardId: project1.id, isRead: true, readAt: new Date() },
      { content: 'We expect to complete floor 2 electrical by end of next week. Everything is on track!', cardId: project1.id, senderId: adminUser.id }
    ]
  })

  // ==========================================
  // CREATE ACTIVITIES
  // ==========================================

  await prisma.activity.createMany({
    data: [
      { type: 'project_created', description: 'Project created', cardId: project1.id, userId: adminUser.id, createdAt: new Date('2024-01-05') },
      { type: 'estimate_sent', description: 'Estimate EST-2024-0001 sent to client', cardId: project1.id, userId: adminUser.id, createdAt: new Date('2024-01-05') },
      { type: 'estimate_accepted', description: 'Estimate accepted by Robert Anderson', cardId: project1.id, userId: adminUser.id, createdAt: new Date('2024-01-10') },
      { type: 'stage_changed', description: 'Moved from Contract to In Progress', metadata: JSON.stringify({ from: 'Contract', to: 'In Progress' }), cardId: project1.id, userId: adminUser.id, createdAt: new Date('2024-01-15') },
      { type: 'vendor_assigned', description: 'Martinez Electric assigned to project', cardId: project1.id, userId: adminUser.id, createdAt: new Date('2024-01-15') },
      { type: 'milestone_completed', description: 'Electrical Rough-In Complete milestone achieved', cardId: project1.id, userId: staffUser1.id, createdAt: new Date('2024-03-12') }
    ]
  })

  // ==========================================
  // CREATE DAILY LOGS
  // ==========================================

  await prisma.dailyLog.createMany({
    data: [
      {
        date: new Date('2024-03-11'),
        cardId: project1.id,
        authorId: staffUser1.id,
        weatherCondition: 'Sunny',
        temperature: 78,
        workCompleted: 'Completed electrical rough-in on floor 2. Installed 45 junction boxes and ran all branch circuits. Ready for inspection tomorrow.',
        materialsUsed: '2500 ft 12/2 Romex, 45 4-square boxes, 20 lbs wire nuts',
        equipment: 'Scissor lift, conduit bender, wire pulling equipment',
        workersOnSite: 6,
        workerDetails: 'Martinez Electric crew (4), Allied staff (2)',
        notes: 'No issues today. On track for inspection.'
      },
      {
        date: new Date('2024-03-12'),
        cardId: project1.id,
        authorId: staffUser1.id,
        weatherCondition: 'Partly Cloudy',
        temperature: 75,
        workCompleted: 'Electrical rough-in inspection passed! Started floor 3 rough-in. HVAC team began removing old ductwork.',
        materialsUsed: '1800 ft 12/2 Romex, 30 4-square boxes',
        equipment: 'Scissor lift, conduit bender, sawzall',
        workersOnSite: 8,
        workerDetails: 'Martinez Electric crew (4), AZ HVAC crew (2), Allied staff (2)',
        notes: 'City inspector approved all floor 2 electrical work. Minor punch list items noted for correction.'
      }
    ]
  })

  // ==========================================
  // CREATE BID REQUESTS & BIDS
  // ==========================================

  const bidRequest = await prisma.bidRequest.create({
    data: {
      title: 'Mesa Restaurant Kitchen Equipment Installation',
      description: 'Seeking bids for commercial kitchen equipment installation including hood system, walk-in cooler, and grease trap.',
      location: 'Mesa, AZ',
      timeline: '3 weeks',
      requirements: 'Must be licensed for commercial kitchen work. Hood system must meet fire code requirements.',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      budget: 85000,
      shareToken: 'bid-' + Math.random().toString(36).substr(2, 9),
      isActive: true,
      cardId: project3.id,
      companyId: company.id,
      creatorId: staffUser2.id
    }
  })

  await prisma.bid.createMany({
    data: [
      {
        bidRequestId: bidRequest.id,
        companyName: 'Valley Kitchen Solutions',
        contactName: 'Mark Taylor',
        contactEmail: 'mtaylor@valleykitchen.com',
        contactPhone: '(555) 222-3333',
        licenseNumber: 'AZ-MECH-33333',
        totalAmount: 78500,
        timeline: '2.5 weeks',
        notes: 'We have installed over 50 commercial kitchens in the Phoenix area.',
        status: BidStatus.UNDER_REVIEW
      },
      {
        bidRequestId: bidRequest.id,
        companyName: 'Pro Restaurant Equipment',
        contactName: 'Susan Lee',
        contactEmail: 'slee@proresteq.com',
        contactPhone: '(555) 444-5555',
        totalAmount: 82000,
        timeline: '3 weeks',
        warranty: '2 year parts and labor warranty included',
        status: BidStatus.SUBMITTED
      }
    ]
  })

  // ==========================================
  // CREATE NOTIFICATIONS
  // ==========================================

  await prisma.notification.createMany({
    data: [
      { type: 'message_received', title: 'New Client Message', message: 'Robert Anderson sent a message about Downtown Phoenix Office Complex', userId: adminUser.id, isRead: false },
      { type: 'task_due', title: 'Task Due Tomorrow', message: 'Install electrical panels - Floor 1 is due tomorrow', userId: subcontractor.id, isRead: false },
      { type: 'milestone_completed', title: 'Milestone Completed', message: 'Electrical Rough-In Complete milestone has been marked as completed', userId: adminUser.id, isRead: true },
      { type: 'bid_received', title: 'New Bid Received', message: 'Valley Kitchen Solutions submitted a bid for Mesa Restaurant Kitchen Equipment', userId: staffUser2.id, isRead: false },
      { type: 'low_stock', title: 'Low Stock Alert', message: '12/2 Romex Wire is running low (1800 ft remaining)', userId: staffUser1.id, isRead: false }
    ]
  })

  // ==========================================
  // CREATE NOTIFICATION PREFERENCES
  // ==========================================

  await prisma.notificationPreference.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      emailEnabled: true,
      inAppEnabled: true,
      emailNewLead: true,
      emailProjectUpdate: true,
      emailTaskAssigned: true,
      emailBidReceived: true
    }
  })

  // ==========================================
  // CREATE PROJECT TEMPLATE
  // ==========================================

  const template = await prisma.projectTemplate.create({
    data: {
      name: 'Commercial Office Renovation',
      description: 'Standard template for commercial office renovation projects',
      icon: '🏢',
      projectDescription: 'Complete commercial office renovation including MEP and finishes',
      timeline: '12-24 weeks',
      priority: Priority.HIGH,
      companyId: company.id
    }
  })

  const templateCat1 = await prisma.projectTemplateCategory.create({
    data: {
      name: 'Pre-Construction',
      description: 'Planning and preparation tasks',
      color: '#6366f1',
      order: 1,
      templateId: template.id
    }
  })

  await prisma.projectTemplateTask.createMany({
    data: [
      { title: 'Site survey and assessment', description: 'Complete initial site survey and document existing conditions', priority: Priority.HIGH, daysFromStart: 1, categoryId: templateCat1.id },
      { title: 'Obtain permits', description: 'Submit and obtain all required permits', priority: Priority.HIGH, daysFromStart: 7, categoryId: templateCat1.id },
      { title: 'Schedule utility shutoffs', description: 'Coordinate with utility companies for service interruptions', priority: Priority.MEDIUM, daysFromStart: 14, categoryId: templateCat1.id }
    ]
  })

  // ==========================================
  // CREATE CLIENT PORTAL SETTINGS
  // ==========================================

  await prisma.clientPortalSettings.create({
    data: {
      projectId: project1.id,
      showProgress: true,
      showTimeline: true,
      showBudgetSummary: false,
      showProjectDescription: true,
      showTeamMembers: true,
      showTasks: true,
      showTaskAssignees: false,
      showTaskDueDates: true,
      showCompletedTasks: true,
      showDocuments: true,
      showEstimates: true,
      showMessages: true,
      showActivityFeed: true,
      showPhotos: true,
      customWelcomeMessage: 'Welcome to the Downtown Phoenix Office Complex project portal!'
    }
  })

  return {
    company,
    users: {
      admin: adminUser,
      staff1: staffUser1,
      staff2: staffUser2,
      staff3: staffUser3,
      subcontractor
    },
    vendors: {
      electrical: vendor1,
      plumbing: vendor2,
      stone: vendor3,
      hvac: vendor4,
      paint: vendor5
    },
    projects: {
      downtown: project1,
      scottsdale: project2,
      mesa: project3,
      tempe: project4
    },
    assets: {
      excavator,
      truck1: workTruck1,
      truck2: workTruck2,
      generator,
      laserLevel
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const companyName = body.companyName || 'Allied Construction'
    const userEmail = body.userEmail || 'bdeller@alliedconstruction.net'

    const result = await seedDemoDatabase(companyName, userEmail)

    return NextResponse.json({
      success: true,
      message: 'Demo database seeded successfully!',
      credentials: {
        admin: `${userEmail} / Demo123!`,
        staff1: 'marcus.chen@alliedconstruction.net / Demo123!',
        staff2: 'lisa.rodriguez@alliedconstruction.net / Demo123!',
        staff3: 'james.wilson@alliedconstruction.net / Demo123!',
        subcontractor: 'tony.martinez@martinezelectric.com / Demo123!'
      },
      stats: {
        company: result.company.name,
        users: 5,
        vendors: 5,
        projects: 4,
        assets: 5,
        stages: 7
      },
      summary: {
        vendors: 'Created 5 vendors with contacts, reviews, and internal comments',
        projects: 'Created 4 projects with tasks, milestones, and categories',
        contracts: 'Created 2 vendor contracts with payment tracking',
        assets: 'Created 5 assets (equipment, vehicles, tools) with maintenance schedules',
        inventory: 'Created procurement items and inventory with transactions',
        purchaseOrders: 'Created 2 purchase orders with line items',
        boq: 'Created 8 BOQ items for the main project',
        documents: 'Created folders and documents for project files',
        estimates: 'Created detailed estimate with line items',
        bidRequests: 'Created bid request with 2 submitted bids'
      }
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

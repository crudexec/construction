import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { Role, Priority, TaskStatus, CardStatus, EstimateStatus, BidStatus, WalkaroundStatus } from '@prisma/client'

async function seedDatabase() {
  // Clean existing data
  await prisma.$transaction([
    prisma.walkaroundPhoto.deleteMany(),
    prisma.walkaround.deleteMany(),
    prisma.clientPortalSettings.deleteMany(),
    prisma.projectTemplateBudget.deleteMany(),
    prisma.projectTemplateTask.deleteMany(),
    prisma.projectTemplateFolder.deleteMany(),
    prisma.projectTemplateCategory.deleteMany(),
    prisma.projectTemplate.deleteMany(),
    prisma.teamInvite.deleteMany(),
    prisma.notificationPreference.deleteMany(),
    prisma.bidView.deleteMany(),
    prisma.bidDocument.deleteMany(),
    prisma.bidItem.deleteMany(),
    prisma.bid.deleteMany(),
    prisma.bidRequest.deleteMany(),
    prisma.taskCommentMention.deleteMany(),
    prisma.taskComment.deleteMany(),
    prisma.taskInteraction.deleteMany(),
    prisma.subcontractorAccess.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.feedback.deleteMany(),
    prisma.message.deleteMany(),
    prisma.activity.deleteMany(),
    prisma.estimateLineItem.deleteMany(),
    prisma.estimateItem.deleteMany(),
    prisma.estimate.deleteMany(),
    prisma.budgetItem.deleteMany(),
    prisma.document.deleteMany(),
    prisma.folder.deleteMany(),
    prisma.task.deleteMany(),
    prisma.taskCategory.deleteMany(),
    prisma.card.deleteMany(),
    prisma.stage.deleteMany(),
    prisma.dailyLog.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany()
  ])

  // Create Company
  const company = await prisma.company.create({
    data: {
      name: 'BuildPro Construction',
      appName: 'BuildFlow CRM',
      website: 'https://buildpro-construction.com',
      phone: '(555) 123-4567',
      email: 'info@buildpro.com',
      address: '123 Construction Ave',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94102',
      country: 'USA',
      currency: 'USD'
    }
  })

  // Create Users
  const hashedPassword = await hash('Demo123!', 10)

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@buildpro.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      phone: '(555) 123-4568',
      role: Role.ADMIN,
      companyId: company.id,
      lastLogin: new Date()
    }
  })

  const staffUser1 = await prisma.user.create({
    data: {
      email: 'sarah.johnson@buildpro.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '(555) 123-4569',
      role: Role.STAFF,
      companyId: company.id,
      lastLogin: new Date(Date.now() - 3600000)
    }
  })

  const staffUser2 = await prisma.user.create({
    data: {
      email: 'mike.wilson@buildpro.com',
      password: hashedPassword,
      firstName: 'Mike',
      lastName: 'Wilson',
      phone: '(555) 123-4570',
      role: Role.STAFF,
      companyId: company.id
    }
  })

  const subcontractor = await prisma.user.create({
    data: {
      email: 'carlos.martinez@electrical.com',
      password: hashedPassword,
      firstName: 'Carlos',
      lastName: 'Martinez',
      phone: '(555) 987-6543',
      role: Role.SUBCONTRACTOR,
      companyId: company.id
    }
  })

  // Create Pipeline Stages
  const stages = await Promise.all([
    prisma.stage.create({
      data: {
        name: 'Lead',
        color: '#94a3b8',
        order: 0,
        companyId: company.id
      }
    }),
    prisma.stage.create({
      data: {
        name: 'Qualification',
        color: '#fbbf24',
        order: 1,
        companyId: company.id
      }
    }),
    prisma.stage.create({
      data: {
        name: 'Proposal',
        color: '#fb923c',
        order: 2,
        companyId: company.id
      }
    }),
    prisma.stage.create({
      data: {
        name: 'Negotiation',
        color: '#a78bfa',
        order: 3,
        companyId: company.id
      }
    }),
    prisma.stage.create({
      data: {
        name: 'Contract',
        color: '#60a5fa',
        order: 4,
        companyId: company.id
      }
    }),
    prisma.stage.create({
      data: {
        name: 'In Progress',
        color: '#34d399',
        order: 5,
        companyId: company.id
      }
    }),
    prisma.stage.create({
      data: {
        name: 'Completed',
        color: '#10b981',
        order: 6,
        companyId: company.id
      }
    })
  ])

  // Create Project Cards
  const kitchenProject = await prisma.card.create({
    data: {
      title: 'Modern Kitchen Remodel',
      description: 'Complete kitchen renovation including new cabinets, countertops, and appliances',
      contactName: 'Robert Thompson',
      contactEmail: 'robert.t@email.com',
      contactPhone: '(555) 234-5678',
      projectAddress: '456 Oak Street',
      projectCity: 'San Francisco',
      projectState: 'CA',
      projectZipCode: '94103',
      projectSize: 250,
      projectSizeUnit: 'sq ft',
      budget: 75000,
      timeline: '6-8 weeks',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-03-15'),
      priority: Priority.HIGH,
      status: CardStatus.ACTIVE,
      stageId: stages[5].id,
      companyId: company.id,
      ownerId: adminUser.id,
      assignedUsers: {
        connect: [{ id: staffUser1.id }, { id: staffUser2.id }]
      }
    }
  })

  const bathroomProject = await prisma.card.create({
    data: {
      title: 'Master Bathroom Addition',
      description: 'Add a new master bathroom to existing bedroom suite',
      contactName: 'Jennifer Williams',
      contactEmail: 'jwilliams@email.com',
      contactPhone: '(555) 345-6789',
      projectAddress: '789 Pine Avenue',
      projectCity: 'Oakland',
      projectState: 'CA',
      projectZipCode: '94601',
      projectSize: 150,
      projectSizeUnit: 'sq ft',
      budget: 45000,
      timeline: '4-5 weeks',
      startDate: new Date('2024-02-01'),
      priority: Priority.MEDIUM,
      status: CardStatus.ACTIVE,
      stageId: stages[3].id,
      companyId: company.id,
      ownerId: staffUser1.id
    }
  })

  const officeProject = await prisma.card.create({
    data: {
      title: 'Corporate Office Renovation',
      description: 'Full office renovation including open workspace, conference rooms, and break area',
      contactName: 'Michael Chen',
      contactEmail: 'mchen@techcorp.com',
      contactPhone: '(555) 456-7890',
      projectAddress: '123 Business Park Dr',
      projectCity: 'San Jose',
      projectState: 'CA',
      projectZipCode: '95110',
      projectSize: 5000,
      projectSizeUnit: 'sq ft',
      budget: 350000,
      timeline: '12-14 weeks',
      priority: Priority.URGENT,
      status: CardStatus.ACTIVE,
      stageId: stages[2].id,
      companyId: company.id,
      ownerId: adminUser.id
    }
  })

  // Create Task Categories for kitchen project
  const demolitionCategory = await prisma.taskCategory.create({
    data: {
      name: 'Demolition',
      description: 'Removal of existing fixtures and structures',
      color: '#ef4444',
      order: 1,
      cardId: kitchenProject.id
    }
  })

  const electricalCategory = await prisma.taskCategory.create({
    data: {
      name: 'Electrical',
      description: 'Electrical work and wiring',
      color: '#f59e0b',
      order: 2,
      cardId: kitchenProject.id
    }
  })

  // Create Tasks
  await prisma.task.create({
    data: {
      title: 'Remove existing cabinets',
      description: 'Carefully remove and dispose of old kitchen cabinets',
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      cardId: kitchenProject.id,
      categoryId: demolitionCategory.id,
      assigneeId: staffUser2.id,
      creatorId: adminUser.id,
      completedAt: new Date('2024-01-18')
    }
  })

  await prisma.task.create({
    data: {
      title: 'Install new electrical outlets',
      description: 'Add 6 new outlets for appliances and counter areas',
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: new Date('2024-02-01'),
      cardId: kitchenProject.id,
      categoryId: electricalCategory.id,
      assigneeId: subcontractor.id,
      creatorId: adminUser.id
    }
  })

  await prisma.task.create({
    data: {
      title: 'Create detailed floor plan',
      description: 'Design bathroom layout with fixture placements',
      status: TaskStatus.COMPLETED,
      priority: Priority.HIGH,
      cardId: bathroomProject.id,
      assigneeId: staffUser1.id,
      creatorId: adminUser.id,
      completedAt: new Date('2024-01-20')
    }
  })

  // Create folders
  const contractsFolder = await prisma.folder.create({
    data: {
      name: 'Contracts',
      description: 'Legal contracts and agreements',
      color: '#dc2626',
      cardId: kitchenProject.id
    }
  })

  // Create document
  await prisma.document.create({
    data: {
      name: 'Kitchen Remodel Contract',
      fileName: 'kitchen-contract.pdf',
      fileSize: 245678,
      mimeType: 'application/pdf',
      url: '/documents/kitchen-contract.pdf',
      folderId: contractsFolder.id,
      cardId: kitchenProject.id,
      uploaderId: adminUser.id
    }
  })

  // Create budget items
  await prisma.budgetItem.create({
    data: {
      name: 'Cabinet Package',
      description: 'Custom kitchen cabinets with soft-close hardware',
      category: 'Materials',
      amount: 18000,
      quantity: 1,
      unit: 'set',
      isExpense: true,
      cardId: kitchenProject.id
    }
  })

  await prisma.budgetItem.create({
    data: {
      name: 'Initial Deposit',
      description: '30% project deposit',
      category: 'Payment',
      amount: 22500,
      quantity: 1,
      isExpense: false,
      isPaid: true,
      paidAt: new Date('2024-01-10'),
      cardId: kitchenProject.id
    }
  })

  // Create estimate
  const estimate = await prisma.estimate.create({
    data: {
      estimateNumber: 'EST-2024-001',
      title: 'Kitchen Remodel Estimate',
      description: 'Complete kitchen renovation with premium materials',
      subtotal: 67500,
      tax: 5906.25,
      discount: 0,
      total: 73406.25,
      status: EstimateStatus.ACCEPTED,
      validUntil: new Date('2024-02-15'),
      sentAt: new Date('2024-01-05'),
      viewedAt: new Date('2024-01-06'),
      acceptedAt: new Date('2024-01-08'),
      signedBy: 'Robert Thompson',
      notes: 'Price includes all materials and labor. Does not include appliances.',
      terms: 'Payment terms: 30% deposit, 40% at midpoint, 30% on completion',
      cardId: kitchenProject.id
    }
  })

  // Create messages
  await prisma.message.create({
    data: {
      content: 'Hi team, the client has approved the kitchen design. We can proceed with ordering materials.',
      isInternal: true,
      cardId: kitchenProject.id,
      senderId: adminUser.id
    }
  })

  await prisma.message.create({
    data: {
      content: 'When will the kitchen demolition begin?',
      isFromClient: true,
      clientName: 'Robert Thompson',
      clientEmail: 'robert.t@email.com',
      cardId: kitchenProject.id,
      isRead: true,
      readAt: new Date()
    }
  })

  // Create activities
  await prisma.activity.create({
    data: {
      type: 'project_created',
      description: 'Project created',
      cardId: kitchenProject.id,
      userId: adminUser.id,
      createdAt: new Date('2024-01-05')
    }
  })

  await prisma.activity.create({
    data: {
      type: 'stage_changed',
      description: 'Moved from Contract to In Progress',
      metadata: JSON.stringify({ from: 'Contract', to: 'In Progress' }),
      cardId: kitchenProject.id,
      userId: adminUser.id,
      createdAt: new Date('2024-01-15')
    }
  })

  // Create daily log
  await prisma.dailyLog.create({
    data: {
      date: new Date('2024-01-18'),
      cardId: kitchenProject.id,
      authorId: staffUser2.id,
      weatherCondition: 'Partly Cloudy',
      temperature: 68,
      workCompleted: 'Completed removal of all upper and lower cabinets. Disposed of old materials. Prepped walls for new cabinet installation.',
      materialsUsed: '20 contractor bags, protective floor covering',
      equipment: 'Cordless drills, pry bars, hand tools',
      workersOnSite: 3,
      workerDetails: 'Mike Wilson (lead), 2 helpers from BuildPro team',
      notes: 'Found some water damage behind sink area. Will need to address before new cabinet installation.',
      photos: JSON.stringify(['/photos/day1-1.jpg', '/photos/day1-2.jpg'])
    }
  })

  // Create notification
  await prisma.notification.create({
    data: {
      type: 'message_received',
      title: 'New Client Message',
      message: 'Robert Thompson sent a message about Kitchen Remodel',
      userId: adminUser.id,
      isRead: true,
      metadata: JSON.stringify({ projectId: kitchenProject.id })
    }
  })

  // Create project template
  const bathroomTemplate = await prisma.projectTemplate.create({
    data: {
      name: 'Standard Bathroom Remodel',
      description: 'Complete bathroom renovation template',
      icon: '🚿',
      projectDescription: 'Full bathroom remodel including fixtures, tiling, and vanity',
      timeline: '3-4 weeks',
      priority: Priority.MEDIUM,
      companyId: company.id
    }
  })

  const bathroomTemplateCategory = await prisma.projectTemplateCategory.create({
    data: {
      name: 'Demolition & Prep',
      description: 'Initial demolition and preparation work',
      color: '#ef4444',
      order: 1,
      templateId: bathroomTemplate.id
    }
  })

  await prisma.projectTemplateTask.create({
    data: {
      title: 'Remove existing fixtures',
      description: 'Remove toilet, vanity, and bathtub/shower',
      priority: Priority.HIGH,
      daysFromStart: 1,
      categoryId: bathroomTemplateCategory.id
    }
  })

  return {
    company,
    users: {
      admin: adminUser,
      staff1: staffUser1,
      staff2: staffUser2,
      subcontractor
    },
    projects: {
      kitchen: kitchenProject,
      bathroom: bathroomProject,
      office: officeProject
    }
  }
}

export async function POST(request: Request) {
  try {
    // Optional: Add authentication check here
    // const session = await getSession()
    // if (!session?.user || session.user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const result = await seedDatabase()
    
    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully!',
      credentials: {
        admin: 'admin@buildpro.com / Demo123!',
        staff: 'sarah.johnson@buildpro.com / Demo123!',
        subcontractor: 'carlos.martinez@electrical.com / Demo123!'
      },
      stats: {
        company: result.company.name,
        users: 4,
        projects: 3,
        stages: 7
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
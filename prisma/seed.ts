import { PrismaClient, Role, Priority, TaskStatus, CardStatus, EstimateStatus, BidStatus, WalkaroundStatus } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Clean existing data
  console.log('🧹 Cleaning existing data...')
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
  console.log('🏢 Creating company...')
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
  console.log('👥 Creating users...')
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

  const clientUser = await prisma.user.create({
    data: {
      email: 'client@example.com',
      password: hashedPassword,
      firstName: 'Emily',
      lastName: 'Davis',
      phone: '(555) 555-0100',
      role: Role.CLIENT,
      companyId: company.id
    }
  })

  // Create Pipeline Stages
  console.log('📊 Creating pipeline stages...')
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
  console.log('🎯 Creating project cards...')
  
  // Project 1: Kitchen Remodel
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

  // Project 2: Bathroom Addition
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
      ownerId: staffUser1.id,
      assignedUsers: {
        connect: [{ id: staffUser2.id }]
      }
    }
  })

  // Project 3: Office Renovation
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
      ownerId: adminUser.id,
      assignedUsers: {
        connect: [{ id: staffUser1.id }, { id: staffUser2.id }, { id: subcontractor.id }]
      }
    }
  })

  // Project 4: Deck Construction (Lead)
  const deckProject = await prisma.card.create({
    data: {
      title: 'Outdoor Deck Construction',
      description: 'Build new composite deck with built-in seating and lighting',
      contactName: 'David Anderson',
      contactEmail: 'danderson@email.com',
      contactPhone: '(555) 567-8901',
      projectAddress: '321 Maple Lane',
      projectCity: 'Berkeley',
      projectState: 'CA',
      projectZipCode: '94704',
      projectSize: 400,
      projectSizeUnit: 'sq ft',
      budget: 25000,
      timeline: '2-3 weeks',
      priority: Priority.LOW,
      status: CardStatus.ACTIVE,
      stageId: stages[0].id,
      companyId: company.id
    }
  })

  // Project 5: Completed Project
  const completedProject = await prisma.card.create({
    data: {
      title: 'Guest House Construction',
      description: 'Build 800 sq ft ADU with full amenities',
      contactName: 'Patricia Miller',
      contactEmail: 'pmiller@email.com',
      contactPhone: '(555) 678-9012',
      projectAddress: '654 Elm Court',
      projectCity: 'Palo Alto',
      projectState: 'CA',
      projectZipCode: '94301',
      projectSize: 800,
      projectSizeUnit: 'sq ft',
      budget: 180000,
      timeline: '16 weeks',
      startDate: new Date('2023-09-01'),
      endDate: new Date('2023-12-20'),
      priority: Priority.HIGH,
      status: CardStatus.COMPLETED,
      stageId: stages[6].id,
      companyId: company.id,
      ownerId: adminUser.id
    }
  })

  // Create Task Categories
  console.log('📋 Creating task categories...')
  const kitchenCategories = await Promise.all([
    prisma.taskCategory.create({
      data: {
        name: 'Demolition',
        description: 'Removal of existing fixtures and structures',
        color: '#ef4444',
        order: 1,
        cardId: kitchenProject.id
      }
    }),
    prisma.taskCategory.create({
      data: {
        name: 'Electrical',
        description: 'Electrical work and wiring',
        color: '#f59e0b',
        order: 2,
        cardId: kitchenProject.id
      }
    }),
    prisma.taskCategory.create({
      data: {
        name: 'Plumbing',
        description: 'Plumbing installation and connections',
        color: '#3b82f6',
        order: 3,
        cardId: kitchenProject.id
      }
    }),
    prisma.taskCategory.create({
      data: {
        name: 'Installation',
        description: 'Cabinet and appliance installation',
        color: '#10b981',
        order: 4,
        cardId: kitchenProject.id
      }
    })
  ])

  // Create Tasks
  console.log('✅ Creating tasks...')
  const tasks = await Promise.all([
    // Kitchen project tasks
    prisma.task.create({
      data: {
        title: 'Remove existing cabinets',
        description: 'Carefully remove and dispose of old kitchen cabinets',
        status: TaskStatus.COMPLETED,
        priority: Priority.HIGH,
        cardId: kitchenProject.id,
        categoryId: kitchenCategories[0].id,
        assigneeId: staffUser2.id,
        creatorId: adminUser.id,
        completedAt: new Date('2024-01-18')
      }
    }),
    prisma.task.create({
      data: {
        title: 'Install new electrical outlets',
        description: 'Add 6 new outlets for appliances and counter areas',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.HIGH,
        dueDate: new Date('2024-02-01'),
        cardId: kitchenProject.id,
        categoryId: kitchenCategories[1].id,
        assigneeId: subcontractor.id,
        creatorId: adminUser.id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Run plumbing for dishwasher',
        description: 'Install water supply and drain lines for new dishwasher',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        dueDate: new Date('2024-02-05'),
        cardId: kitchenProject.id,
        categoryId: kitchenCategories[2].id,
        creatorId: staffUser1.id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Install upper cabinets',
        description: 'Mount and level all upper cabinet units',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: new Date('2024-02-10'),
        cardId: kitchenProject.id,
        categoryId: kitchenCategories[3].id,
        assigneeId: staffUser2.id,
        creatorId: adminUser.id
      }
    }),
    
    // Bathroom project tasks
    prisma.task.create({
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
    }),
    prisma.task.create({
      data: {
        title: 'Order bathroom fixtures',
        description: 'Order vanity, toilet, shower system from supplier',
        status: TaskStatus.TODO,
        priority: Priority.URGENT,
        dueDate: new Date('2024-01-28'),
        cardId: bathroomProject.id,
        creatorId: staffUser1.id
      }
    }),

    // Office project tasks
    prisma.task.create({
      data: {
        title: 'Finalize office layout design',
        description: 'Get client approval on final workspace design',
        status: TaskStatus.IN_PROGRESS,
        priority: Priority.URGENT,
        dueDate: new Date('2024-01-30'),
        cardId: officeProject.id,
        assigneeId: adminUser.id,
        creatorId: adminUser.id
      }
    }),
    prisma.task.create({
      data: {
        title: 'Schedule permit inspection',
        description: 'Coordinate with city for building permit inspection',
        status: TaskStatus.TODO,
        priority: Priority.HIGH,
        dueDate: new Date('2024-02-15'),
        cardId: officeProject.id,
        assigneeId: staffUser1.id,
        creatorId: adminUser.id
      }
    })
  ])

  // Create Task Dependencies
  console.log('🔗 Creating task dependencies...')
  await prisma.task.update({
    where: { id: tasks[3].id },
    data: {
      dependsOn: {
        connect: [{ id: tasks[1].id }, { id: tasks[2].id }]
      }
    }
  })

  // Create Folders and Documents
  console.log('📁 Creating folders and documents...')
  const contractsFolder = await prisma.folder.create({
    data: {
      name: 'Contracts',
      description: 'Legal contracts and agreements',
      color: '#dc2626',
      cardId: kitchenProject.id
    }
  })

  const plansFolder = await prisma.folder.create({
    data: {
      name: 'Plans & Designs',
      description: 'Architectural plans and design documents',
      color: '#2563eb',
      cardId: kitchenProject.id
    }
  })

  const photosFolder = await prisma.folder.create({
    data: {
      name: 'Progress Photos',
      description: 'Daily progress photos',
      color: '#16a34a',
      cardId: kitchenProject.id
    }
  })

  await Promise.all([
    prisma.document.create({
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
    }),
    prisma.document.create({
      data: {
        name: 'Kitchen Layout Plan',
        fileName: 'kitchen-layout.pdf',
        fileSize: 567890,
        mimeType: 'application/pdf',
        url: '/documents/kitchen-layout.pdf',
        folderId: plansFolder.id,
        cardId: kitchenProject.id,
        uploaderId: staffUser1.id
      }
    }),
    prisma.document.create({
      data: {
        name: 'Week 1 Progress',
        fileName: 'week1-photos.zip',
        fileSize: 12567890,
        mimeType: 'application/zip',
        url: '/documents/week1-photos.zip',
        folderId: photosFolder.id,
        cardId: kitchenProject.id,
        uploaderId: staffUser2.id
      }
    })
  ])

  // Create Budget Items
  console.log('💰 Creating budget items...')
  await Promise.all([
    prisma.budgetItem.create({
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
    }),
    prisma.budgetItem.create({
      data: {
        name: 'Granite Countertops',
        description: 'Premium granite with edge treatment',
        category: 'Materials',
        amount: 8500,
        quantity: 85,
        unit: 'sq ft',
        isExpense: true,
        cardId: kitchenProject.id
      }
    }),
    prisma.budgetItem.create({
      data: {
        name: 'Labor - Installation',
        description: 'Cabinet and countertop installation',
        category: 'Labor',
        amount: 12000,
        quantity: 1,
        unit: 'job',
        isExpense: true,
        cardId: kitchenProject.id
      }
    }),
    prisma.budgetItem.create({
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
  ])

  // Create Estimate Templates
  console.log('📝 Creating estimate templates...')
  const estimateItems = await Promise.all([
    prisma.estimateItem.create({
      data: {
        name: 'Demolition - Kitchen',
        description: 'Remove existing kitchen fixtures and prep for renovation',
        category: 'Demolition',
        unitPrice: 2500,
        unit: 'room',
        companyId: company.id
      }
    }),
    prisma.estimateItem.create({
      data: {
        name: 'Electrical Outlet Installation',
        description: 'Install new electrical outlet with proper grounding',
        category: 'Electrical',
        unitPrice: 250,
        unit: 'outlet',
        companyId: company.id
      }
    }),
    prisma.estimateItem.create({
      data: {
        name: 'Plumbing Rough-In',
        description: 'Install water supply and drain lines',
        category: 'Plumbing',
        unitPrice: 1500,
        unit: 'fixture',
        companyId: company.id
      }
    })
  ])

  // Create Estimates
  console.log('💵 Creating estimates...')
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

  await Promise.all([
    prisma.estimateLineItem.create({
      data: {
        name: 'Kitchen Demolition',
        description: 'Complete removal of existing kitchen',
        quantity: 1,
        unit: 'room',
        unitPrice: 2500,
        total: 2500,
        order: 1,
        estimateId: estimate.id,
        itemTemplateId: estimateItems[0].id
      }
    }),
    prisma.estimateLineItem.create({
      data: {
        name: 'Cabinet Installation',
        description: 'Supply and install custom cabinets',
        quantity: 1,
        unit: 'set',
        unitPrice: 18000,
        total: 18000,
        order: 2,
        estimateId: estimate.id
      }
    }),
    prisma.estimateLineItem.create({
      data: {
        name: 'Countertop Installation',
        description: 'Granite countertops with undermount sink cutout',
        quantity: 85,
        unit: 'sq ft',
        unitPrice: 100,
        total: 8500,
        order: 3,
        estimateId: estimate.id
      }
    })
  ])

  // Create Messages
  console.log('💬 Creating messages...')
  await Promise.all([
    prisma.message.create({
      data: {
        content: 'Hi team, the client has approved the kitchen design. We can proceed with ordering materials.',
        isInternal: true,
        cardId: kitchenProject.id,
        senderId: adminUser.id
      }
    }),
    prisma.message.create({
      data: {
        content: 'Great news! I\'ll place the cabinet order today.',
        isInternal: true,
        cardId: kitchenProject.id,
        senderId: staffUser1.id
      }
    }),
    prisma.message.create({
      data: {
        content: 'When will the kitchen demolition begin?',
        isFromClient: true,
        clientName: 'Robert Thompson',
        clientEmail: 'robert.t@email.com',
        cardId: kitchenProject.id,
        isRead: true,
        readAt: new Date()
      }
    }),
    prisma.message.create({
      data: {
        content: 'Hi Robert, demolition is scheduled to begin this Monday, January 15th at 8 AM.',
        isInternal: false,
        cardId: kitchenProject.id,
        senderId: adminUser.id
      }
    })
  ])

  // Create Activities
  console.log('📊 Creating activity logs...')
  await Promise.all([
    prisma.activity.create({
      data: {
        type: 'project_created',
        description: 'Project created',
        cardId: kitchenProject.id,
        userId: adminUser.id,
        createdAt: new Date('2024-01-05')
      }
    }),
    prisma.activity.create({
      data: {
        type: 'stage_changed',
        description: 'Moved from Contract to In Progress',
        metadata: JSON.stringify({ from: 'Contract', to: 'In Progress' }),
        cardId: kitchenProject.id,
        userId: adminUser.id,
        createdAt: new Date('2024-01-15')
      }
    }),
    prisma.activity.create({
      data: {
        type: 'task_completed',
        description: 'Completed task: Remove existing cabinets',
        cardId: kitchenProject.id,
        userId: staffUser2.id,
        createdAt: new Date('2024-01-18')
      }
    })
  ])

  // Create Daily Logs
  console.log('📅 Creating daily logs...')
  await Promise.all([
    prisma.dailyLog.create({
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
    }),
    prisma.dailyLog.create({
      data: {
        date: new Date('2024-01-19'),
        cardId: kitchenProject.id,
        authorId: adminUser.id,
        weatherCondition: 'Sunny',
        temperature: 72,
        workCompleted: 'Electrician started rough-in work for new outlets. Installed boxes for 4 new outlets.',
        materialsUsed: '4 outlet boxes, 50ft 12-gauge wire',
        equipment: 'Wire strippers, voltage tester, drill',
        workersOnSite: 2,
        workerDetails: 'Carlos Martinez (electrician), 1 helper',
        notes: 'Electrical work proceeding on schedule. Inspector scheduled for next week.'
      }
    })
  ])

  // Create Bid Request
  console.log('🔨 Creating bid requests...')
  const bidRequest = await prisma.bidRequest.create({
    data: {
      title: 'Commercial Office Build-Out',
      description: 'Complete build-out of 10,000 sq ft office space including conference rooms, open workspace, and break areas',
      location: '500 Tech Park Blvd, San Jose, CA',
      timeline: '3-4 months',
      requirements: 'Must be licensed and insured. Previous commercial experience required.',
      deadline: new Date('2024-02-15'),
      budget: 500000,
      shareToken: 'bid-' + Math.random().toString(36).substring(7),
      companyId: company.id,
      creatorId: adminUser.id
    }
  })

  // Create Bids
  await Promise.all([
    prisma.bid.create({
      data: {
        bidRequestId: bidRequest.id,
        companyName: 'Premier Electric',
        contactName: 'Tom Rodriguez',
        contactEmail: 'tom@premierelectric.com',
        contactPhone: '(555) 111-2222',
        licenseNumber: 'C-10 #789456',
        insuranceInfo: 'Fully insured - $2M liability',
        totalAmount: 85000,
        timeline: '4 weeks for electrical work',
        warranty: '2 year warranty on all work',
        paymentTerms: 'Net 30',
        status: BidStatus.UNDER_REVIEW
      }
    }),
    prisma.bid.create({
      data: {
        bidRequestId: bidRequest.id,
        companyName: 'Quality Plumbing Co',
        contactName: 'Maria Santos',
        contactEmail: 'maria@qualityplumbing.com',
        contactPhone: '(555) 333-4444',
        licenseNumber: 'C-36 #456789',
        totalAmount: 62000,
        timeline: '3 weeks for all plumbing',
        status: BidStatus.SUBMITTED
      }
    })
  ])

  // Create Walkaround
  console.log('🚶 Creating walkarounds...')
  const walkaround = await prisma.walkaround.create({
    data: {
      projectId: kitchenProject.id,
      userId: adminUser.id,
      startTime: new Date('2024-01-18T09:00:00'),
      endTime: new Date('2024-01-18T09:30:00'),
      transcript: 'Starting kitchen demolition walkaround. Cabinets have been successfully removed. Wall preparation is complete. Minor water damage found behind sink - already addressed. Electrical rough-in scheduled for tomorrow.',
      summary: 'Kitchen demolition complete. Ready for electrical and plumbing rough-in.',
      status: WalkaroundStatus.COMPLETED,
      audioUrl: '/audio/walkaround-kitchen-01-18.m4a'
    }
  })

  await Promise.all([
    prisma.walkaroundPhoto.create({
      data: {
        walkaroundId: walkaround.id,
        url: '/photos/walkaround-1.jpg',
        thumbnailUrl: '/photos/walkaround-1-thumb.jpg',
        timestamp: new Date('2024-01-18T09:05:00'),
        caption: 'Removed upper cabinets - wall ready for new installation',
        order: 1
      }
    }),
    prisma.walkaroundPhoto.create({
      data: {
        walkaroundId: walkaround.id,
        url: '/photos/walkaround-2.jpg',
        thumbnailUrl: '/photos/walkaround-2-thumb.jpg',
        timestamp: new Date('2024-01-18T09:10:00'),
        caption: 'Water damage area repaired and ready',
        order: 2
      }
    })
  ])

  // Create Notifications
  console.log('🔔 Creating notifications...')
  await Promise.all([
    prisma.notification.create({
      data: {
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned to "Install new electrical outlets"',
        userId: subcontractor.id,
        metadata: JSON.stringify({ taskId: tasks[1].id, projectId: kitchenProject.id })
      }
    }),
    prisma.notification.create({
      data: {
        type: 'message_received',
        title: 'New Client Message',
        message: 'Robert Thompson sent a message about Kitchen Remodel',
        userId: adminUser.id,
        isRead: true,
        metadata: JSON.stringify({ projectId: kitchenProject.id })
      }
    })
  ])

  // Create Notification Preferences
  console.log('⚙️ Creating notification preferences...')
  await prisma.notificationPreference.create({
    data: {
      userId: adminUser.id,
      emailNewLead: true,
      emailProjectUpdate: true,
      emailTaskAssigned: true,
      emailBidReceived: true,
      pushProjectUpdate: true,
      pushTaskAssigned: true,
      pushBidReceived: true
    }
  })

  // Create Project Templates
  console.log('📐 Creating project templates...')
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

  await Promise.all([
    prisma.projectTemplateTask.create({
      data: {
        title: 'Remove existing fixtures',
        description: 'Remove toilet, vanity, and bathtub/shower',
        priority: Priority.HIGH,
        daysFromStart: 1,
        categoryId: bathroomTemplateCategory.id
      }
    }),
    prisma.projectTemplateTask.create({
      data: {
        title: 'Inspect plumbing',
        description: 'Check all plumbing connections and identify needed repairs',
        priority: Priority.HIGH,
        daysFromStart: 2,
        categoryId: bathroomTemplateCategory.id
      }
    })
  ])

  await prisma.projectTemplateFolder.create({
    data: {
      name: 'Permits & Inspections',
      description: 'Building permits and inspection documents',
      color: '#dc2626',
      templateId: bathroomTemplate.id
    }
  })

  await Promise.all([
    prisma.projectTemplateBudget.create({
      data: {
        name: 'Vanity Package',
        description: 'Vanity with countertop and sink',
        category: 'Fixtures',
        amount: 2500,
        quantity: 1,
        unit: 'set',
        templateId: bathroomTemplate.id
      }
    }),
    prisma.projectTemplateBudget.create({
      data: {
        name: 'Tile Installation',
        description: 'Floor and wall tile with labor',
        category: 'Materials & Labor',
        amount: 3500,
        quantity: 120,
        unit: 'sq ft',
        templateId: bathroomTemplate.id
      }
    })
  ])

  // Create Client Portal Settings
  console.log('🌐 Creating client portal settings...')
  await prisma.clientPortalSettings.create({
    data: {
      projectId: kitchenProject.id,
      showProgress: true,
      showTimeline: true,
      showBudgetSummary: true,
      showProjectDescription: true,
      showTeamMembers: true,
      showTasks: true,
      showTaskDueDates: true,
      showCompletedTasks: true,
      hideInternalTasks: true,
      showDocuments: true,
      hideInternalDocuments: true,
      showEstimates: true,
      showEstimateDetails: true,
      showMessages: true,
      showActivityFeed: true,
      hideInternalMessages: true,
      showPhotos: true,
      showWalkarounds: true,
      customWelcomeMessage: 'Welcome to your project portal! Here you can track progress, view documents, and communicate with our team.'
    }
  })

  console.log('✨ Seeding completed successfully!')
  console.log('\n📧 Demo Login Credentials:')
  console.log('Admin: admin@buildpro.com / Demo123!')
  console.log('Staff: sarah.johnson@buildpro.com / Demo123!')
  console.log('Client: client@example.com / Demo123!')
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
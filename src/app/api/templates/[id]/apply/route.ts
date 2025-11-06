import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'

interface ApplyTemplateRequest {
  title?: string
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  projectAddress?: string
  projectCity?: string
  projectState?: string
  projectZipCode?: string
  projectSize?: number
  projectSizeUnit?: string
  budget?: number
  startDate?: string
  endDate?: string
  priority?: string
  customFields?: any
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verify(token.value, process.env.JWT_SECRET || 'secret') as any
    const body: ApplyTemplateRequest = await request.json()
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const resolvedParams = await params
    const template = await prisma.projectTemplate.findFirst({
      where: {
        id: resolvedParams.id,
        companyId: user.companyId,
        isActive: true
      },
      include: {
        taskCategories: {
          include: {
            tasks: true
          },
          orderBy: { order: 'asc' }
        },
        folders: {
          include: {
            children: true
          }
        },
        budgetItems: true
      }
    })
    
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    
    // Find or create a "Projects" stage
    let projectStage = await prisma.stage.findFirst({
      where: { 
        companyId: user.companyId,
        name: 'Projects'
      }
    })

    if (!projectStage) {
      const maxOrder = await prisma.stage.findFirst({
        where: { companyId: user.companyId },
        orderBy: { order: 'desc' },
        select: { order: true }
      })

      projectStage = await prisma.stage.create({
        data: {
          name: 'Projects',
          color: '#10b981',
          order: (maxOrder?.order || 0) + 1,
          companyId: user.companyId
        }
      })
    }
    
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    
    // Create the project first
    const project = await prisma.card.create({
      data: {
        title: body.title || template.title || template.name,
        description: body.description || template.projectDescription,
        contactName: body.contactName || template.contactName,
        contactEmail: body.contactEmail || template.contactEmail,
        contactPhone: body.contactPhone || template.contactPhone,
        projectAddress: body.projectAddress || template.projectAddress,
        projectCity: body.projectCity || template.projectCity,
        projectState: body.projectState || template.projectState,
        projectZipCode: body.projectZipCode || template.projectZipCode,
        projectSize: body.projectSize || template.projectSize,
        projectSizeUnit: body.projectSizeUnit || template.projectSizeUnit,
        budget: body.budget || template.budget,
        timeline: template.timeline,
        startDate: startDate,
        endDate: body.endDate ? new Date(body.endDate) : null,
        priority: (body.priority || template.priority) as any,
        customFields: body.customFields || template.customFields,
        stageId: projectStage.id,
        companyId: user.companyId,
        ownerId: decoded.userId
      }
    })

    // Create task categories and tasks
    for (const category of template.taskCategories) {
      const createdCategory = await prisma.taskCategory.create({
        data: {
          name: category.name,
          description: category.description,
          color: category.color,
          order: category.order,
          cardId: project.id
        }
      })

      // Create tasks for this category
      for (const task of category.tasks) {
        await prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: task.daysFromStart 
              ? new Date(startDate.getTime() + task.daysFromStart * 24 * 60 * 60 * 1000)
              : null,
            status: 'TODO',
            cardId: project.id,
            categoryId: createdCategory.id,
            creatorId: decoded.userId
          }
        })
      }
    }

    // Create budget items
    for (const item of template.budgetItems) {
      await prisma.budgetItem.create({
        data: {
          name: item.name,
          description: item.description,
          category: item.category,
          amount: item.amount,
          quantity: item.quantity,
          unit: item.unit,
          isExpense: item.isExpense,
          cardId: project.id
        }
      })
    }
    
    await createProjectFoldersFromTemplate(project.id, template.id)
    
    await prisma.activity.create({
      data: {
        type: 'PROJECT_CREATED_FROM_TEMPLATE',
        description: `Project created from template "${template.name}"`,
        metadata: JSON.stringify({ templateId: template.id, templateName: template.name }),
        cardId: project.id,
        userId: decoded.userId
      }
    })
    
    // Fetch the complete project with all related data
    const completeProject = await prisma.card.findUnique({
      where: { id: project.id },
      include: {
        taskCategories: {
          include: {
            tasks: true
          }
        },
        folders: true,
        budgetItems: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })
    
    return NextResponse.json(completeProject)
  } catch (error) {
    console.error('Template application error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function createProjectFoldersFromTemplate(projectId: string, templateId: string) {
  const templateFolders = await prisma.projectTemplateFolder.findMany({
    where: { templateId },
    include: { children: true }
  })
  
  const folderMapping = new Map<string, string>()
  
  async function createFolderRecursive(
    templateFolder: any,
    parentId: string | null = null
  ) {
    const created = await prisma.folder.create({
      data: {
        name: templateFolder.name,
        description: templateFolder.description,
        color: templateFolder.color,
        cardId: projectId,
        parentId
      }
    })
    
    folderMapping.set(templateFolder.id, created.id)
    
    if (templateFolder.children && templateFolder.children.length > 0) {
      for (const child of templateFolder.children) {
        await createFolderRecursive(child, created.id)
      }
    }
  }
  
  const rootFolders = templateFolders.filter(f => !f.parentId)
  for (const folder of rootFolders) {
    await createFolderRecursive(folder)
  }
}
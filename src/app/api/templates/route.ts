import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verify } from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import type { Priority } from '@prisma/client'

interface TemplateCategory {
  name: string
  description?: string
  color: string
  order: number
  tasks: Array<{
    title: string
    description?: string
    priority: Priority
    daysFromStart?: number
  }>
}

interface TemplateFolder {
  name: string
  description?: string
  color: string
  children?: TemplateFolder[]
}

interface TemplateBudgetItem {
  name: string
  description?: string
  category: string
  amount: number
  quantity: number
  unit?: string
  isExpense: boolean
}

interface CreateTemplateRequest {
  name: string
  description?: string
  icon?: string
  title?: string
  projectDescription?: string
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
  timeline?: string
  priority?: Priority
  customFields?: any
  taskCategories?: TemplateCategory[]
  folders?: TemplateFolder[]
  budgetItems?: TemplateBudgetItem[]
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verify(token.value, process.env.JWT_SECRET || 'secret') as any
    const body: CreateTemplateRequest = await request.json()
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { company: true }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    const template = await prisma.projectTemplate.create({
      data: {
        name: body.name,
        description: body.description || null,
        icon: body.icon || null,
        title: body.title || null,
        projectDescription: body.projectDescription || null,
        contactName: body.contactName || null,
        contactEmail: body.contactEmail || null,
        contactPhone: body.contactPhone || null,
        projectAddress: body.projectAddress || null,
        projectCity: body.projectCity || null,
        projectState: body.projectState || null,
        projectZipCode: body.projectZipCode || null,
        projectSize: body.projectSize ? parseFloat(body.projectSize.toString()) : null,
        projectSizeUnit: body.projectSizeUnit || null,
        budget: body.budget ? parseFloat(body.budget.toString()) : null,
        timeline: body.timeline || null,
        priority: body.priority || 'MEDIUM',
        customFields: body.customFields ? JSON.stringify(body.customFields) : null,
        companyId: user.companyId,
        taskCategories: body.taskCategories ? {
          create: body.taskCategories.map(category => ({
            name: category.name,
            description: category.description || null,
            color: category.color || '#6366f1',
            order: category.order || 0,
            tasks: {
              create: category.tasks.map(task => ({
                title: task.title,
                description: task.description || null,
                priority: task.priority || 'MEDIUM',
                daysFromStart: task.daysFromStart || null
              }))
            }
          }))
        } : undefined,
        budgetItems: body.budgetItems ? {
          create: body.budgetItems.map(item => ({
            name: item.name,
            description: item.description || null,
            category: item.category,
            amount: parseFloat(item.amount.toString()),
            quantity: parseFloat(item.quantity.toString()),
            unit: item.unit || null,
            isExpense: item.isExpense
          }))
        } : undefined
      },
      include: {
        taskCategories: {
          include: {
            tasks: true
          },
          orderBy: { order: 'asc' }
        },
        folders: true,
        budgetItems: true
      }
    })
    
    if (body.folders && body.folders.length > 0) {
      await createFoldersRecursive(template.id, body.folders, null)
    }
    
    const completeTemplate = await prisma.projectTemplate.findUnique({
      where: { id: template.id },
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
    
    return NextResponse.json(completeTemplate)
  } catch (error) {
    console.error('Template creation error:', error)
    return NextResponse.json({ 
      error: 'Failed to create template', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

async function createFoldersRecursive(
  templateId: string,
  folders: TemplateFolder[],
  parentId: string | null
) {
  for (const folder of folders) {
    const created = await prisma.projectTemplateFolder.create({
      data: {
        name: folder.name,
        description: folder.description,
        color: folder.color,
        templateId,
        parentId
      }
    })
    
    if (folder.children && folder.children.length > 0) {
      await createFoldersRecursive(templateId, folder.children, created.id)
    }
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const decoded = verify(token.value, process.env.JWT_SECRET || 'secret') as any
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const templates = await prisma.projectTemplate.findMany({
      where: {
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
          where: { parentId: null },
          include: {
            children: true
          }
        },
        budgetItems: true
      },
      orderBy: { name: 'asc' }
    })
    
    return NextResponse.json(templates)
  } catch (error) {
    console.error('Template fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { DocumentTemplateType } from '@prisma/client'

// GET - List all templates for the company
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as DocumentTemplateType | null
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const whereClause: any = {
      companyId: user.companyId,
    }

    if (type) {
      whereClause.type = type
    }

    if (activeOnly) {
      whereClause.isActive = true
    }

    const templates = await prisma.documentTemplate.findMany({
      where: whereClause,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { isDefault: 'desc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json({ templates })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

// POST - Create a new template
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create templates' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, description, type, content, isDefault } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      )
    }

    if (!type) {
      return NextResponse.json(
        { error: 'Template type is required' },
        { status: 400 }
      )
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'Template content is required' },
        { status: 400 }
      )
    }

    // If setting as default, unset any existing defaults for this type
    if (isDefault) {
      await prisma.documentTemplate.updateMany({
        where: {
          companyId: user.companyId,
          type: type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Check if this is the first template of this type (auto-set as default)
    const existingCount = await prisma.documentTemplate.count({
      where: {
        companyId: user.companyId,
        type: type,
      },
    })

    const template = await prisma.documentTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type,
        content,
        isDefault: isDefault || existingCount === 0, // First template is default
        companyId: user.companyId,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}

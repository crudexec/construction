import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// POST - Duplicate a template
export async function POST(request: NextRequest, { params }: Params) {
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
        { error: 'Only admins can duplicate templates' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check template exists and belongs to company
    const sourceTemplate = await prisma.documentTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!sourceTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Create duplicate with new name
    const duplicateTemplate = await prisma.documentTemplate.create({
      data: {
        name: `${sourceTemplate.name} (Copy)`,
        description: sourceTemplate.description,
        type: sourceTemplate.type,
        content: sourceTemplate.content,
        isDefault: false, // Duplicates are never default
        isActive: true,
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

    return NextResponse.json({ template: duplicateTemplate }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating template:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate template' },
      { status: 500 }
    )
  }
}

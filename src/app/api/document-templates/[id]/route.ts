import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// GET - Get a single template
export async function GET(request: NextRequest, { params }: Params) {
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

    const { id } = await params

    const template = await prisma.documentTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
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

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error fetching template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    )
  }
}

// PUT - Update a template
export async function PUT(request: NextRequest, { params }: Params) {
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
        { error: 'Only admins can update templates' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check template exists and belongs to company
    const existingTemplate = await prisma.documentTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { name, description, content, isActive } = body

    const updateData: any = {}

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Template name cannot be empty' },
          { status: 400 }
        )
      }
      updateData.name = name.trim()
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return NextResponse.json(
          { error: 'Template content cannot be empty' },
          { status: 400 }
        )
      }
      updateData.content = content
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const template = await prisma.documentTemplate.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ template })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a template
export async function DELETE(request: NextRequest, { params }: Params) {
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
        { error: 'Only admins can delete templates' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check template exists and belongs to company
    const existingTemplate = await prisma.documentTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    await prisma.documentTemplate.delete({
      where: { id },
    })

    // If this was the default, set another template as default
    if (existingTemplate.isDefault) {
      const nextTemplate = await prisma.documentTemplate.findFirst({
        where: {
          companyId: user.companyId,
          type: existingTemplate.type,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      })

      if (nextTemplate) {
        await prisma.documentTemplate.update({
          where: { id: nextTemplate.id },
          data: { isDefault: true },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    )
  }
}

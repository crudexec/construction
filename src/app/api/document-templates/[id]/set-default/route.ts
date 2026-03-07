import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

type Params = { params: Promise<{ id: string }> }

// POST - Set a template as the default for its type
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
        { error: 'Only admins can set default templates' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check template exists and belongs to company
    const template = await prisma.documentTemplate.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Unset existing default for this type
    await prisma.documentTemplate.updateMany({
      where: {
        companyId: user.companyId,
        type: template.type,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    })

    // Set this template as default
    const updatedTemplate = await prisma.documentTemplate.update({
      where: { id },
      data: { isDefault: true },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json({ template: updatedTemplate })
  } catch (error) {
    console.error('Error setting default template:', error)
    return NextResponse.json(
      { error: 'Failed to set default template' },
      { status: 500 }
    )
  }
}

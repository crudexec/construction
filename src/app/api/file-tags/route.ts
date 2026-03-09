import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - List all file tags for the company
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

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const tags = await prisma.fileTag.findMany({
      where: {
        companyId: user.companyId,
        ...(category && { category }),
        ...(!includeInactive && { isActive: true })
      },
      include: {
        _count: {
          select: {
            vendorDocuments: true,
            documents: true,
            bidDocuments: true,
            contractDocuments: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    })

    // Format response with document counts
    const tagsWithCount = tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      description: tag.description,
      color: tag.color,
      category: tag.category,
      isActive: tag.isActive,
      documentCount: tag._count.vendorDocuments + tag._count.documents + tag._count.bidDocuments + tag._count.contractDocuments,
      vendorDocumentCount: tag._count.vendorDocuments,
      projectDocumentCount: tag._count.documents,
      bidDocumentCount: tag._count.bidDocuments,
      contractDocumentCount: tag._count.contractDocuments,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt
    }))

    return NextResponse.json(tagsWithCount)

  } catch (error) {
    console.error('Error fetching file tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file tags' },
      { status: 500 }
    )
  }
}

// POST - Create a new file tag
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

    // Only admins can create tags
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create tags' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color, category } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await prisma.fileTag.findUnique({
      where: {
        companyId_name: {
          companyId: user.companyId,
          name: name.trim()
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 })
    }

    const tag = await prisma.fileTag.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        category: category?.trim() || null,
        companyId: user.companyId
      }
    })

    return NextResponse.json(tag, { status: 201 })

  } catch (error) {
    console.error('Error creating file tag:', error)
    return NextResponse.json(
      { error: 'Failed to create file tag' },
      { status: 500 }
    )
  }
}

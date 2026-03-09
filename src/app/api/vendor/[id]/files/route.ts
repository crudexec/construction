import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: vendorId } = await params
    const { searchParams } = new URL(request.url)
    const tagIdsParam = searchParams.get('tagIds')
    const tagIds = tagIdsParam ? tagIdsParam.split(',').filter(Boolean) : []

    // Verify vendor exists and user has access
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Build where clause with optional tag filtering
    const whereClause: {
      vendorId: string
      tags?: { some: { tagId: { in: string[] } } }
    } = {
      vendorId: vendorId
    }

    if (tagIds.length > 0) {
      whereClause.tags = {
        some: {
          tagId: { in: tagIds }
        }
      }
    }

    const documents = await prisma.vendorDocument.findMany({
      where: whereClause,
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format documents to flatten tags
    const formattedDocuments = documents.map(doc => ({
      ...doc,
      tags: doc.tags.map(t => t.tag)
    }))

    return NextResponse.json(formattedDocuments)
  } catch (error) {
    console.error('Error fetching vendor files:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor files' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: vendorId } = await params

    // Verify vendor exists and user has access
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const folderId = formData.get('folderId') as string | null
    const tagIdsJson = formData.get('tagIds') as string | null
    const tagIds: string[] = tagIdsJson ? JSON.parse(tagIdsJson) : []

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // If folderId provided, verify it belongs to this vendor
    if (folderId) {
      const folder = await prisma.vendorFolder.findFirst({
        where: {
          id: folderId,
          vendorId: vendorId
        }
      })
      if (!folder) {
        return NextResponse.json({ error: 'Folder not found' }, { status: 400 })
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'vendors', vendorId)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filePath = join(uploadsDir, fileName)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create database record with tag assignments
    const document = await prisma.vendorDocument.create({
      data: {
        name: name || file.name,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: `/uploads/vendors/${vendorId}/${fileName}`,
        isShared: false,
        vendorId: vendorId,
        uploaderId: user.id,
        folderId: folderId || null,
        ...(tagIds.length > 0 && {
          tags: {
            create: tagIds.map(tagId => ({
              tag: { connect: { id: tagId } }
            }))
          }
        })
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true
              }
            }
          }
        }
      }
    })

    // Format to flatten tags
    const formattedDocument = {
      ...document,
      tags: document.tags.map(t => t.tag)
    }

    return NextResponse.json(formattedDocument)
  } catch (error) {
    console.error('Error uploading vendor file:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const GENERATED_DOCS_FOLDER_NAME = 'Generated Documents'
const GENERATED_DOCS_FOLDER_COLOR = '#10b981' // Green color

/**
 * POST /api/vendor/[id]/files/auto-save
 * Auto-save generated documents (like change orders) to a vendor's files
 */
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
    const filename = formData.get('filename') as string
    const documentType = formData.get('documentType') as string // e.g., 'change-order', 'purchase-order'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Find or create the "Generated Documents" folder
    let folder = await prisma.vendorFolder.findFirst({
      where: {
        vendorId: vendorId,
        name: GENERATED_DOCS_FOLDER_NAME,
        parentId: null // Root level folder
      }
    })

    if (!folder) {
      folder = await prisma.vendorFolder.create({
        data: {
          name: GENERATED_DOCS_FOLDER_NAME,
          description: 'Automatically saved copies of generated documents (change orders, contracts, etc.)',
          color: GENERATED_DOCS_FOLDER_COLOR,
          vendorId: vendorId
        }
      })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'vendors', vendorId)
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const safeFilename = (filename || file.name).replace(/[^a-zA-Z0-9.-]/g, '_')
    const storedFileName = `${timestamp}-${safeFilename}`
    const filePath = join(uploadsDir, storedFileName)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create database record in the Generated Documents folder
    const document = await prisma.vendorDocument.create({
      data: {
        name: filename || file.name,
        fileName: filename || file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/pdf',
        url: `/uploads/vendors/${vendorId}/${storedFileName}`,
        isShared: false,
        vendorId: vendorId,
        uploaderId: user.id,
        folderId: folder.id
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
        folder: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      document,
      message: `Document saved to "${GENERATED_DOCS_FOLDER_NAME}" folder`
    })
  } catch (error) {
    console.error('Error auto-saving vendor document:', error)
    return NextResponse.json(
      { error: 'Failed to save document' },
      { status: 500 }
    )
  }
}

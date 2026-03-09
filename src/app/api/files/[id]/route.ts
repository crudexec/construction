import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

// Common document structure for file serving
interface FileDocument {
  id: string
  name: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  companyId: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const requestUrl = new URL(request.url)
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') ||
                  request.cookies.get('auth-token')?.value ||
                  requestUrl.searchParams.get('t') // Token in query params for viewing

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = await params
    const download = requestUrl.searchParams.get('download') === 'true'

    let fileDoc: FileDocument | null = null

    // Try to find project document first
    const projectDocument = await prisma.document.findFirst({
      where: {
        id: documentId
      },
      include: {
        card: {
          select: {
            companyId: true,
            title: true
          }
        }
      }
    })

    if (projectDocument) {
      fileDoc = {
        id: projectDocument.id,
        name: projectDocument.name,
        fileName: projectDocument.fileName,
        fileSize: projectDocument.fileSize,
        mimeType: projectDocument.mimeType,
        url: projectDocument.url,
        companyId: projectDocument.card.companyId
      }
    } else {
      // Try to find vendor document
      const vendorDocument = await prisma.vendorDocument.findFirst({
        where: {
          id: documentId
        },
        include: {
          vendor: {
            select: {
              companyId: true,
              name: true
            }
          }
        }
      })

      if (vendorDocument) {
        fileDoc = {
          id: vendorDocument.id,
          name: vendorDocument.name,
          fileName: vendorDocument.fileName,
          fileSize: vendorDocument.fileSize,
          mimeType: vendorDocument.mimeType,
          url: vendorDocument.url,
          companyId: vendorDocument.vendor.companyId
        }
      }
    }

    if (!fileDoc || fileDoc.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if file exists on filesystem
    let filePath: string
    let fileBuffer: Buffer

    // Handle different storage methods
    if (fileDoc.url.startsWith('/uploads/') || fileDoc.url.startsWith('uploads/')) {
      // Local file storage
      const uploadPath = process.env.UPLOAD_PATH || 'uploads'
      filePath = join(process.cwd(), uploadPath, fileDoc.url.replace('/uploads/', '').replace('uploads/', ''))

      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
      }

      fileBuffer = await readFile(filePath)
    } else if (fileDoc.url.startsWith('http')) {
      // External URL - fetch and serve
      const response = await fetch(fileDoc.url)
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch external file' }, { status: 404 })
      }
      fileBuffer = Buffer.from(await response.arrayBuffer())
    } else {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
    }

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', fileDoc.mimeType || 'application/octet-stream')
    headers.set('Content-Length', fileBuffer.length.toString())

    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${fileDoc.fileName}"`)
    } else {
      // For inline viewing (PDFs, images)
      if (fileDoc.mimeType?.includes('pdf') || fileDoc.mimeType?.startsWith('image/')) {
        headers.set('Content-Disposition', `inline; filename="${fileDoc.fileName}"`)
      } else {
        headers.set('Content-Disposition', `attachment; filename="${fileDoc.fileName}"`)
      }
    }

    return new NextResponse(fileBuffer as BodyInit, { headers })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}
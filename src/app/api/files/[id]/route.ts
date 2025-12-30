import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

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

    // Verify document exists and user has access
    const document = await prisma.document.findFirst({
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

    if (!document || document.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if file exists on filesystem
    let filePath: string
    let fileBuffer: Buffer

    // Handle different storage methods
    if (document.url.startsWith('/uploads/') || document.url.startsWith('uploads/')) {
      // Local file storage
      const uploadPath = process.env.UPLOAD_PATH || 'uploads'
      filePath = join(process.cwd(), uploadPath, document.url.replace('/uploads/', '').replace('uploads/', ''))
      
      if (!existsSync(filePath)) {
        return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
      }
      
      fileBuffer = await readFile(filePath)
    } else if (document.url.startsWith('http')) {
      // External URL - fetch and serve
      const response = await fetch(document.url)
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch external file' }, { status: 404 })
      }
      fileBuffer = Buffer.from(await response.arrayBuffer())
    } else {
      return NextResponse.json({ error: 'Invalid file URL' }, { status: 400 })
    }

    // Set appropriate headers
    const headers = new Headers()
    headers.set('Content-Type', document.mimeType || 'application/octet-stream')
    headers.set('Content-Length', fileBuffer.length.toString())
    
    if (download) {
      headers.set('Content-Disposition', `attachment; filename="${document.fileName}"`)
    } else {
      // For inline viewing (PDFs, images)
      if (document.mimeType?.includes('pdf') || document.mimeType?.startsWith('image/')) {
        headers.set('Content-Disposition', `inline; filename="${document.fileName}"`)
      } else {
        headers.set('Content-Disposition', `attachment; filename="${document.fileName}"`)
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
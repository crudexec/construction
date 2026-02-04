import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    const { id } = await params

    // Verify asset exists and belongs to user's company
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'assets', id)
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const ext = path.extname(file.name)
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
    const filePath = path.join(uploadDir, filename)

    // Write file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Generate URL path
    const photoUrl = `/uploads/assets/${id}/${filename}`

    // Update asset photos (stored as JSON string)
    const currentPhotos: string[] = asset.photos ? JSON.parse(asset.photos) : []
    const updatedPhotos = [...currentPhotos, photoUrl]

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        photos: JSON.stringify(updatedPhotos)
      }
    })

    return NextResponse.json({
      message: 'Photo uploaded successfully',
      url: photoUrl,
      photos: updatedPhotos
    }, { status: 201 })

  } catch (error) {
    console.error('Error uploading asset photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const photoUrl = searchParams.get('url')

    if (!photoUrl) {
      return NextResponse.json({ error: 'Photo URL is required' }, { status: 400 })
    }

    // Verify asset exists and belongs to user's company
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Remove photo from array (stored as JSON string)
    const currentPhotos: string[] = asset.photos ? JSON.parse(asset.photos) : []
    const updatedPhotos = currentPhotos.filter(p => p !== photoUrl)

    if (currentPhotos.length === updatedPhotos.length) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
    }

    await prisma.asset.update({
      where: { id },
      data: {
        photos: JSON.stringify(updatedPhotos)
      }
    })

    // Try to delete file from filesystem
    try {
      const { unlink } = await import('fs/promises')
      const filePath = path.join(process.cwd(), 'public', photoUrl)
      await unlink(filePath)
    } catch (fileError) {
      console.warn('Could not delete file from filesystem:', fileError)
    }

    return NextResponse.json({
      message: 'Photo deleted successfully',
      photos: updatedPhotos
    })

  } catch (error) {
    console.error('Error deleting asset photo:', error)
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { LienReleaseStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

    const lienRelease = await prisma.lienRelease.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      select: {
        id: true,
        vendorId: true,
        status: true
      }
    })

    if (!lienRelease) {
      return NextResponse.json({ error: 'Lien release not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const kindValue = formData.get('kind')
    const kind = typeof kindValue === 'string' && kindValue ? kindValue : 'SIGNED_RELEASE'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'lien-releases', lienRelease.vendorId)
    await mkdir(uploadDir, { recursive: true })

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storedFileName = `${timestamp}-${sanitizedName}`
    const filePath = path.join(uploadDir, storedFileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const now = new Date()

    const createdDocument = await prisma.$transaction(async (tx) => {
      const document = await tx.lienReleaseDocument.create({
        data: {
          lienReleaseId: lienRelease.id,
          fileName: storedFileName,
          originalName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          url: `/uploads/lien-releases/${lienRelease.vendorId}/${storedFileName}`,
          kind,
          uploadedById: user.id
        }
      })

      if (kind === 'SIGNED_RELEASE') {
        await tx.lienRelease.update({
          where: { id: lienRelease.id },
          data: {
            status: LienReleaseStatus.SUBMITTED,
            submittedAt: now,
            submittedByVendor: false,
            rejectionReason: null,
          }
        })
      }

      await tx.lienReleaseEvent.create({
        data: {
          lienReleaseId: lienRelease.id,
          actorUserId: user.id,
          eventType: kind === 'SIGNED_RELEASE' ? 'SUBMITTED' : 'DOCUMENT_UPLOADED',
          message: kind === 'SIGNED_RELEASE' ? 'Signed lien release uploaded' : `${kind} uploaded`
        }
      })

      return document
    })

    return NextResponse.json(createdDocument, { status: 201 })
  } catch (error) {
    console.error('Error uploading lien release document:', error)
    return NextResponse.json(
      { error: 'Failed to upload lien release document' },
      { status: 500 }
    )
  }
}

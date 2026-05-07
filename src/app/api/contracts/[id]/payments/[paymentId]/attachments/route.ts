import { ContractPaymentAttachmentKind } from '@prisma/client'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_KINDS = new Set<ContractPaymentAttachmentKind>([
  'CONDITIONAL_LIEN_RELEASE',
  'UNCONDITIONAL_LIEN_RELEASE',
  'GENERAL_ATTACHMENT',
])

async function findPayment(contractId: string, paymentId: string, companyId: string) {
  return prisma.contractPayment.findFirst({
    where: {
      id: paymentId,
      contractId,
      contract: {
        vendor: {
          companyId,
        },
      },
    },
    select: {
      id: true,
      contract: {
        select: {
          vendorId: true,
        },
      },
    },
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
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

    const { id: contractId, paymentId } = await params
    const payment = await findPayment(contractId, paymentId, user.companyId)

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const kindValue = formData.get('kind')
    const kind = typeof kindValue === 'string' ? kindValue as ContractPaymentAttachmentKind : 'GENERAL_ATTACHMENT'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!VALID_KINDS.has(kind)) {
      return NextResponse.json({ error: 'Invalid attachment kind' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contract-payments', payment.contract.vendorId)
    await mkdir(uploadDir, { recursive: true })

    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storedFileName = `${timestamp}-${sanitizedName}`
    const filePath = path.join(uploadDir, storedFileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    const attachment = await prisma.contractPaymentAttachment.create({
      data: {
        paymentId,
        fileName: storedFileName,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: `/uploads/contract-payments/${payment.contract.vendorId}/${storedFileName}`,
        kind,
        uploadedById: user.id,
      },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Error uploading contract payment attachment:', error)
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
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

    const { id: contractId, paymentId } = await params
    const payment = await findPayment(contractId, paymentId, user.companyId)
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID is required' }, { status: 400 })
    }

    await prisma.contractPaymentAttachment.deleteMany({
      where: {
        id: attachmentId,
        paymentId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contract payment attachment:', error)
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}

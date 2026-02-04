import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { unlink } from 'fs/promises'
import path from 'path'

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

    // Verify attachment exists and belongs to user's company
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id,
        task: {
          card: {
            companyId: user.companyId
          }
        }
      }
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    // Try to delete the file from filesystem
    try {
      const filePath = path.join(process.cwd(), 'public', attachment.url)
      await unlink(filePath)
    } catch (fileError) {
      console.warn('Could not delete file from filesystem:', fileError)
      // Continue even if file deletion fails
    }

    // Delete database record
    await prisma.taskAttachment.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Attachment deleted successfully' })

  } catch (error) {
    console.error('Error deleting attachment:', error)
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}

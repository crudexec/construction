import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// DELETE /api/stock-alerts/config/[id] - Delete a stock alert config
 async function DELETEHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete stock alert configs
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete stock alert configs' }, { status: 403 })
    }

    const { id } = await params

    // Verify config belongs to user's company
    const config = await prisma.stockAlertConfig.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    }

    await prisma.stockAlertConfig.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Config deleted successfully' })
  } catch (error) {
    console.error('Error deleting stock alert config:', error)
    return NextResponse.json({ error: 'Failed to delete config' }, { status: 500 })
  }
}

// PATCH /api/stock-alerts/config/[id] - Toggle active status
 async function PATCHHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update stock alert configs' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { isActive, recipientIds, threshold } = body

    // Verify config belongs to user's company
    const config = await prisma.stockAlertConfig.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 })
    }

    // If updating recipients, verify they belong to user's company
    if (recipientIds) {
      const validRecipients = await prisma.user.count({
        where: {
          id: { in: recipientIds },
          companyId: user.companyId,
        },
      })

      if (validRecipients !== recipientIds.length) {
        return NextResponse.json(
          { error: 'One or more recipients are invalid' },
          { status: 400 }
        )
      }
    }

    const updated = await prisma.stockAlertConfig.update({
      where: { id },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(recipientIds !== undefined && { recipientIds: JSON.stringify(recipientIds) }),
        ...(threshold !== undefined && { threshold }),
      },
    })

    return NextResponse.json({
      ...updated,
      recipientIds: JSON.parse(updated.recipientIds),
    })
  } catch (error) {
    console.error('Error updating stock alert config:', error)
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}


export const DELETE = auditedRoute('/api/stock-alerts/config/[id]', 'DELETE', DELETEHandler)
export const PATCH = auditedRoute('/api/stock-alerts/config/[id]', 'PATCH', PATCHHandler)

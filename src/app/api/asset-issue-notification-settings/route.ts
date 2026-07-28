import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
  if (!token) return null
  return validateUser(token)
}

async function validateRecipientUserIds(companyId: string, recipientUserIds: unknown) {
  if (!Array.isArray(recipientUserIds)) return []

  const ids = Array.from(new Set(
    recipientUserIds
      .filter((id): id is string => typeof id === 'string')
      .map((id) => id.trim())
      .filter(Boolean)
  ))

  if (ids.length === 0) return []

  const users = await prisma.user.findMany({
    where: {
      id: { in: ids },
      companyId,
      isActive: true,
    },
    select: { id: true },
  })

  if (users.length !== ids.length) {
    return { error: 'One or more notification recipients were not found' as const }
  }

  return ids
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setting = await prisma.assetIssueNotificationSetting.upsert({
      where: { companyId: user.companyId },
      update: {},
      create: { companyId: user.companyId },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error fetching asset issue notification settings:', error)
    return NextResponse.json({ error: 'Failed to fetch asset issue notification settings' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update asset issue notification settings' }, { status: 403 })
    }

    const body = await request.json()
    const recipientResult = await validateRecipientUserIds(user.companyId, body.recipientUserIds)

    if (!Array.isArray(recipientResult) && 'error' in recipientResult) {
      return NextResponse.json({ error: recipientResult.error }, { status: 400 })
    }

    const setting = await prisma.assetIssueNotificationSetting.upsert({
      where: { companyId: user.companyId },
      update: {
        ...(typeof body.notifyAdmins === 'boolean' && { notifyAdmins: body.notifyAdmins }),
        ...(typeof body.notifyStaff === 'boolean' && { notifyStaff: body.notifyStaff }),
        ...(body.recipientUserIds !== undefined && { recipientUserIds: recipientResult }),
      },
      create: {
        companyId: user.companyId,
        notifyAdmins: typeof body.notifyAdmins === 'boolean' ? body.notifyAdmins : true,
        notifyStaff: typeof body.notifyStaff === 'boolean' ? body.notifyStaff : false,
        recipientUserIds: body.recipientUserIds !== undefined ? recipientResult : [],
      },
    })

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error updating asset issue notification settings:', error)
    return NextResponse.json({ error: 'Failed to update asset issue notification settings' }, { status: 500 })
  }
}

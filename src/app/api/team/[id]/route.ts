import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import bcrypt from 'bcryptjs'

 async function PATCHHandler(
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const { role, isActive, newPassword } = await request.json()

    const target = await prisma.user.findFirst({ where: { id, companyId: user.companyId }, select: { feedbackManager: true, platformAdmin: true } })
    if (!target) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    if ((target.feedbackManager || target.platformAdmin) && id !== user.id) {
      return NextResponse.json({ error: 'Company admins cannot modify a platform super admin account.' }, { status: 403 })
    }

    // Prevent self-demotion
    if (id === user.id && role !== undefined && role !== 'ADMIN') {
      return NextResponse.json({ error: 'Cannot change your own admin role' }, { status: 400 })
    }

    // Prevent self-deactivation
    if (id === user.id && isActive === false) {
      return NextResponse.json({ error: 'Cannot deactivate your own account' }, { status: 400 })
    }

    // Handle password reset if provided
    let hashedPassword
    if (newPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
      }
      hashedPassword = await bcrypt.hash(newPassword, 10)
    }

    const updatedUser = await prisma.user.update({
      where: { 
        id,
        companyId: user.companyId,
        ...(id !== user.id && { feedbackManager: { is: null }, platformAdmin: { is: null } })
      },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(hashedPassword && { password: hashedPassword }),
        ...((hashedPassword || isActive === false || role !== undefined) && { sessionVersion: { increment: 1 } })
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true
      }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Error updating team member:', error)
    return NextResponse.json(
      { error: 'Failed to update team member' },
      { status: 500 }
    )
  }
}

 async function DELETEHandler(
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = await params

    // Prevent self-deletion
    if (id === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const target = await prisma.user.findFirst({ where: { id, companyId: user.companyId }, select: { feedbackManager: true, platformAdmin: true } })
    if (!target) return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    if (target.feedbackManager || target.platformAdmin) {
      return NextResponse.json({ error: 'Company admins cannot remove a platform super admin account.' }, { status: 403 })
    }

    // Soft delete - just set isActive to false
    await prisma.user.update({
      where: { 
        id,
        companyId: user.companyId,
        feedbackManager: { is: null }, platformAdmin: { is: null }
      },
      data: {
        isActive: false,
        sessionVersion: { increment: 1 }
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting team member:', error)
    return NextResponse.json(
      { error: 'Failed to delete team member' },
      { status: 500 }
    )
  }
}

export const PATCH = auditedRoute('/api/team/[id]', 'PATCH', PATCHHandler)
export const DELETE = auditedRoute('/api/team/[id]', 'DELETE', DELETEHandler)

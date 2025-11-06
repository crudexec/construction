import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { randomBytes } from 'crypto'

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

    const { id: projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Generate a unique client access token
    const clientToken = randomBytes(32).toString('hex')

    // Store the client access token in the project
    const updatedProject = await prisma.card.update({
      where: { id: projectId },
      data: {
        customFields: JSON.stringify({
          ...JSON.parse(project.customFields || '{}'),
          clientAccessToken: clientToken,
          clientAccessEnabled: true,
          clientAccessCreatedAt: new Date().toISOString(),
          clientAccessCreatedBy: user.id
        })
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'client_access_enabled',
        description: `Enabled client portal access for ${project.contactName || 'client'}`,
        cardId: project.id,
        userId: user.id
      }
    })

    // Generate the client portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const clientUrl = `${baseUrl}/client/project/${clientToken}`

    return NextResponse.json({ 
      clientUrl,
      clientToken,
      enabled: true
    })
  } catch (error) {
    console.error('Error enabling client access:', error)
    return NextResponse.json(
      { error: 'Failed to enable client access' },
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

    const { id: projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Disable client access
    await prisma.card.update({
      where: { id: projectId },
      data: {
        customFields: JSON.stringify({
          ...JSON.parse(project.customFields || '{}'),
          clientAccessToken: null,
          clientAccessEnabled: false,
          clientAccessDisabledAt: new Date().toISOString(),
          clientAccessDisabledBy: user.id
        })
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'client_access_disabled',
        description: 'Disabled client portal access',
        cardId: project.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true, enabled: false })
  } catch (error) {
    console.error('Error disabling client access:', error)
    return NextResponse.json(
      { error: 'Failed to disable client access' },
      { status: 500 }
    )
  }
}